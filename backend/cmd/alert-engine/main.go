package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/weqory/backend/internal/alert"
	"github.com/weqory/backend/internal/binance"
	"github.com/weqory/backend/internal/cache"
	"github.com/weqory/backend/pkg/config"
	"github.com/weqory/backend/pkg/database"
	"github.com/weqory/backend/pkg/logger"
	"github.com/weqory/backend/pkg/redis"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", slog.String("error", err.Error()))
		os.Exit(1)
	}

	// Initialize logger
	log := logger.New(cfg.Server.Env)
	log.Info("starting alert-engine",
		slog.String("env", cfg.Server.Env),
		slog.String("port", cfg.Server.Port),
	)

	// Create context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Connect to PostgreSQL
	pool, err := database.NewPostgresPool(ctx, database.PostgresConfig{
		URL:             cfg.Database.URL,
		MaxConns:        cfg.Database.MaxConns,
		MinConns:        cfg.Database.MinConns,
		MaxConnLifetime: cfg.Database.MaxConnLifetime,
		MaxConnIdleTime: cfg.Database.MaxConnIdleTime,
	})
	if err != nil {
		log.Error("failed to connect to postgres", slog.String("error", err.Error()))
		os.Exit(1)
	}
	defer pool.Close()
	log.Info("connected to PostgreSQL")

	// Connect to Redis
	redisClient, err := redis.NewClient(ctx, redis.Config{
		URL:      cfg.Redis.URL,
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})
	if err != nil {
		log.Error("failed to connect to redis", slog.String("error", err.Error()))
		os.Exit(1)
	}
	defer redisClient.Close()
	log.Info("connected to Redis")

	// Initialize components
	binanceClient := binance.NewClient(log.Logger)
	priceCache := cache.NewPriceCache(redisClient, log.Logger)
	publisher := alert.NewPublisher(redisClient, log.Logger)

	// Initialize alert engine
	engine := alert.NewEngine(pool, binanceClient, priceCache, log.Logger)
	engine.SetTriggerHandler(publisher.CreateTriggerHandler())

	// Start retry queue processor in background
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := publisher.ProcessRetryQueue(ctx); err != nil {
					if ctx.Err() == nil {
						log.Error("retry queue processing error", slog.String("error", err.Error()))
					}
				}
			}
		}
	}()

	// Start alert engine in background
	go func() {
		if err := engine.Run(ctx); err != nil {
			if ctx.Err() == nil {
				log.Error("alert engine error", slog.String("error", err.Error()))
			}
		}
	}()

	// Health check and metrics server
	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","service":"alert-engine"}`))
	})

	mux.HandleFunc("/metrics", func(w http.ResponseWriter, r *http.Request) {
		retryQueueLen, _ := publisher.GetRetryQueueLength(context.Background())

		metrics := map[string]interface{}{
			"active_alerts":      engine.GetAlertCount(),
			"monitored_symbols":  engine.GetSymbolCount(),
			"binance_connected":  binanceClient.IsConnected(),
			"retry_queue_length": retryQueueLen,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(metrics)
	})

	mux.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		if !binanceClient.IsConnected() {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte(`{"status":"not ready","reason":"binance not connected"}`))
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ready"}`))
	})

	server := &http.Server{
		Addr:    ":" + cfg.Server.Port,
		Handler: mux,
	}

	go func() {
		log.Info("health/metrics server starting", slog.String("port", cfg.Server.Port))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error("server error", slog.String("error", err.Error()))
		}
	}()

	log.Info("alert engine started successfully")

	// Graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	log.Info("shutting down alert-engine...")

	// Create shutdown context with timeout
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	// Shutdown HTTP server first to stop accepting new requests
	log.Info("shutting down HTTP server...")
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Error("server shutdown error", slog.String("error", err.Error()))
	}

	// Cancel main context to signal goroutines to stop
	cancel()

	// Stop alert engine (waits for background tasks with timeout)
	engine.Stop()

	log.Info("alert-engine stopped gracefully")
}
