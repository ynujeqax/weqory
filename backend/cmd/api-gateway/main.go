package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/weqory/backend/internal/api/handlers"
	"github.com/weqory/backend/internal/api/middleware"
	"github.com/weqory/backend/internal/api/routes"
	"github.com/weqory/backend/internal/coingecko"
	"github.com/weqory/backend/internal/service"
	"github.com/weqory/backend/internal/websocket"
	"github.com/weqory/backend/pkg/config"
	"github.com/weqory/backend/pkg/database"
	"github.com/weqory/backend/pkg/logger"
	"github.com/weqory/backend/pkg/redis"
	"github.com/weqory/backend/pkg/validator"
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
	log.Info("starting api-gateway",
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

	// Initialize validator
	v := validator.New()

	// Initialize services (services use pool directly, not repositories)
	userService := service.NewUserService(pool)
	watchlistService := service.NewWatchlistService(pool, userService)
	alertService := service.NewAlertService(pool, userService, watchlistService)
	historyService := service.NewHistoryService(pool, userService)

	// AuthService needs JWT config and bot token
	authService := service.NewAuthService(userService, cfg.JWT.Secret, cfg.Telegram.BotToken, cfg.JWT.Expiry)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService, v)
	userHandler := handlers.NewUserHandler(userService, watchlistService, alertService, historyService, v)
	watchlistHandler := handlers.NewWatchlistHandler(watchlistService, userService, v)
	alertsHandler := handlers.NewAlertsHandler(alertService, userService, v)
	historyHandler := handlers.NewHistoryHandler(historyService)
	marketHandler := handlers.NewMarketHandler(watchlistService)

	// Initialize WebSocket hub
	wsHub := websocket.NewHub(log.Logger)
	go wsHub.Run(ctx)

	// Initialize WebSocket handler
	wsHandler := websocket.NewHandler(wsHub, log.Logger)

	// Initialize CoinGecko sync service
	cgClient := coingecko.NewClient(cfg.CoinGecko.APIKey, log.Logger)
	cgSync := coingecko.NewSyncService(cgClient, pool, log.Logger)
	// Sync top 100 coins every hour
	cgSync.StartPeriodicSync(ctx, 100, 1*time.Hour)

	// Setup rate limiter
	rateLimiter := redis.NewRateLimiter(redisClient)

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:               "Weqory API Gateway",
		ReadTimeout:           30 * time.Second,
		WriteTimeout:          30 * time.Second,
		IdleTimeout:           120 * time.Second,
		DisableStartupMessage: cfg.IsProduction(),
	})

	// Global middleware
	app.Use(recover.New())
	app.Use(middleware.RequestID())
	app.Use(middleware.Logging(middleware.LoggingConfig{
		Logger:     log,
		SkipPaths:  []string{"/health"},
		SlowThreshold: 500 * time.Millisecond,
	}))

	// CORS configuration
	app.Use(cors.New(cors.Config{
		AllowOriginsFunc: func(origin string) bool {
			// In production, only allow specific origins
			if cfg.IsProduction() {
				if cfg.Telegram.MiniAppURL != "" && origin == cfg.Telegram.MiniAppURL {
					return true
				}
				// Allow Render preview URLs and common Telegram domains
				return origin == "https://weqory-app.onrender.com" ||
					origin == "https://web.telegram.org" ||
					origin == "https://telegram.org"
			}
			// In development, allow all origins
			return true
		},
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-Request-ID,X-Telegram-Init-Data",
		AllowCredentials: true,
	}))

	// Setup routes
	routes.Setup(app, &routes.Config{
		BotToken:    cfg.Telegram.BotToken,
		RateLimiter: rateLimiter,
		Log:         log,
		UserService: userService,
		Handlers: &routes.Handlers{
			Auth:      authHandler,
			User:      userHandler,
			Watchlist: watchlistHandler,
			Alerts:    alertsHandler,
			History:   historyHandler,
			Market:    marketHandler,
		},
		WSHandler: wsHandler,
	})

	// Graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		log.Info("shutting down server...")
		cancel()

		if err := app.ShutdownWithTimeout(30 * time.Second); err != nil {
			log.Error("server shutdown error", slog.String("error", err.Error()))
		}
	}()

	// Start server
	log.Info("server starting", slog.String("addr", ":"+cfg.Server.Port))
	if err := app.Listen(":" + cfg.Server.Port); err != nil {
		log.Error("server error", slog.String("error", err.Error()))
		os.Exit(1)
	}
}
