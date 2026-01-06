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

	"github.com/weqory/backend/internal/notification"
	"github.com/weqory/backend/internal/telegram"
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
	log.Info("starting notification-service",
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

	// Initialize Telegram client
	telegramClient := telegram.NewClient(cfg.Telegram.BotToken, log.Logger)

	// Verify bot token
	botUser, err := telegramClient.GetMe(ctx)
	if err != nil {
		log.Error("failed to verify telegram bot", slog.String("error", err.Error()))
		os.Exit(1)
	}
	log.Info("telegram bot verified",
		slog.String("username", botUser.Username),
		slog.Int64("bot_id", botUser.ID),
	)

	// Initialize notification service
	notificationService := notification.NewService(
		pool,
		redisClient,
		telegramClient,
		cfg.Telegram.MiniAppURL,
		log.Logger,
	)

	// Initialize subscriber
	subscriber := notification.NewSubscriber(
		pool,
		redisClient,
		notificationService,
		log.Logger,
	)

	// Start subscriber in background
	go func() {
		if err := subscriber.Run(ctx); err != nil {
			if ctx.Err() == nil {
				log.Error("subscriber error", slog.String("error", err.Error()))
			}
		}
	}()

	// Health check and metrics server
	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","service":"notification"}`))
	})

	mux.HandleFunc("/metrics", func(w http.ResponseWriter, r *http.Request) {
		sent, failed, rateLimited := notificationService.GetStats()

		metrics := map[string]interface{}{
			"notifications_sent":         sent,
			"notifications_failed":       failed,
			"notifications_rate_limited": rateLimited,
			"queue_length":               subscriber.GetQueueLength(),
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(metrics)
	})

	mux.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		// Check if we can reach Telegram
		_, err := telegramClient.GetMe(context.Background())
		if err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte(`{"status":"not ready","reason":"telegram not reachable"}`))
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

	log.Info("notification service started successfully")

	// Graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	log.Info("shutting down notification-service...")

	// Create shutdown context with timeout
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	// Shutdown HTTP server
	log.Info("shutting down HTTP server...")
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Error("server shutdown error", slog.String("error", err.Error()))
	}

	// Cancel main context
	cancel()

	// Stop subscriber
	subscriber.Stop()

	// Stop notification service
	notificationService.Stop()

	log.Info("notification-service stopped gracefully")
}
