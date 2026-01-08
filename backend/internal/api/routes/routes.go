package routes

import (
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/weqory/backend/internal/api/handlers"
	"github.com/weqory/backend/internal/api/middleware"
	"github.com/weqory/backend/internal/service"
	ws "github.com/weqory/backend/internal/websocket"
	"github.com/weqory/backend/pkg/errors"
	"github.com/weqory/backend/pkg/logger"
	"github.com/weqory/backend/pkg/redis"
)

// Config holds route configuration
type Config struct {
	BotToken     string
	RateLimiter  *redis.RateLimiter
	Log          *logger.Logger
	UserService  *service.UserService
	Handlers     *Handlers
	WSHandler    *ws.Handler
}

// Handlers holds all HTTP handlers
type Handlers struct {
	Auth      *handlers.AuthHandler
	User      *handlers.UserHandler
	Watchlist *handlers.WatchlistHandler
	Alerts    *handlers.AlertsHandler
	History   *handlers.HistoryHandler
	Market    *handlers.MarketHandler
	Payment   *handlers.PaymentHandler
}

// Setup sets up all API routes
func Setup(app *fiber.App, cfg *Config) {
	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "healthy",
		})
	})

	// Global rate limiting
	app.Use(middleware.RateLimit(middleware.RateLimitConfig{
		Limiter:       cfg.RateLimiter,
		MaxRequests:   100,
		WindowSeconds: 60,
		KeyPrefix:     "global",
	}))

	// API v1 routes
	api := app.Group("/api/v1")

	// Public routes
	setupPublicRoutes(api, cfg)

	// Protected routes (require authentication)
	authMiddleware := middleware.Auth(middleware.AuthConfig{
		BotToken:  cfg.BotToken,
		Logger:    cfg.Log,
		SkipPaths: []string{"/health", "/api/v1/auth"},
	})
	protected := api.Group("", authMiddleware, func(c *fiber.Ctx) error {
		telegramID := middleware.GetTelegramID(c)
		if telegramID == 0 {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": errors.ErrUnauthorized.Error(),
			})
		}

		// Fetch user from database by Telegram ID
		user, err := cfg.UserService.GetByTelegramID(c.Context(), telegramID)
		if err != nil {
			if errors.IsAppError(err) {
				statusCode := errors.GetStatusCode(err)
				return c.Status(statusCode).JSON(fiber.Map{
					"error": err.Error(),
				})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to fetch user",
			})
		}

		// Store database user ID in context
		middleware.SetUserID(c, user.ID)
		return c.Next()
	})
	setupProtectedRoutes(protected, cfg)

	// WebSocket route
	setupWebSocketRoutes(app, cfg)
}

// setupPublicRoutes sets up routes that don't require authentication
func setupPublicRoutes(router fiber.Router, cfg *Config) {
	// Auth routes
	auth := router.Group("/auth")
	auth.Post("/telegram", cfg.Handlers.Auth.Authenticate)

	// Public market routes (same data for all users)
	market := router.Group("/market")
	market.Get("/overview", cfg.Handlers.Market.GetMarketOverview)

	// Public coins list (for market page)
	router.Get("/coins", cfg.Handlers.Watchlist.GetAvailableCoins)

	// Payment routes (public)
	payments := router.Group("/payments")
	payments.Get("/plans", cfg.Handlers.Payment.GetPlans)      // Get available plans (no auth)
	payments.Post("/webhook", cfg.Handlers.Payment.HandleWebhook) // Telegram webhook (no auth)
}

// setupProtectedRoutes sets up routes that require authentication
func setupProtectedRoutes(router fiber.Router, cfg *Config) {
	// User routes
	users := router.Group("/users")
	users.Get("/me", cfg.Handlers.User.GetMe)
	users.Patch("/me/settings", cfg.Handlers.User.UpdateSettings)
	users.Delete("/me/watchlist", cfg.Handlers.User.DeleteWatchlist)
	users.Delete("/me/alerts", cfg.Handlers.User.DeleteAlerts)
	users.Delete("/me/history", cfg.Handlers.User.DeleteHistory)

	// Watchlist routes
	watchlist := router.Group("/watchlist")
	watchlist.Get("/", cfg.Handlers.Watchlist.GetWatchlist)
	watchlist.Post("/", cfg.Handlers.Watchlist.AddToWatchlist)
	watchlist.Delete("/:symbol", cfg.Handlers.Watchlist.RemoveFromWatchlist)
	watchlist.Get("/available-coins", cfg.Handlers.Watchlist.GetAvailableCoins)

	// Alerts routes
	alerts := router.Group("/alerts")
	alerts.Get("/", cfg.Handlers.Alerts.GetAlerts)
	alerts.Post("/", cfg.Handlers.Alerts.CreateAlert)
	alerts.Patch("/:id/pause", cfg.Handlers.Alerts.UpdateAlert)
	alerts.Delete("/:id", cfg.Handlers.Alerts.DeleteAlert)

	// History routes
	history := router.Group("/history")
	history.Get("/", cfg.Handlers.History.GetHistory)

	// Payment routes (protected - require auth)
	payments := router.Group("/payments")
	payments.Post("/create-invoice", cfg.Handlers.Payment.CreateInvoice)
	payments.Get("/history", cfg.Handlers.Payment.GetPaymentHistory)
}

// setupWebSocketRoutes sets up WebSocket routes
func setupWebSocketRoutes(app *fiber.App, cfg *Config) {
	// WebSocket upgrade middleware
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	// WebSocket endpoint for price updates
	app.Get("/ws/prices", cfg.WSHandler.Upgrade())
}
