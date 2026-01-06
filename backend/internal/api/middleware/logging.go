package middleware

import (
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/weqory/backend/pkg/logger"
)

// RequestID adds a unique request ID to each request
func RequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		requestID := c.Get("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}
		c.Set("X-Request-ID", requestID)
		c.Locals("request_id", requestID)
		return c.Next()
	}
}

// GetRequestID retrieves request ID from context
func GetRequestID(c *fiber.Ctx) string {
	if id, ok := c.Locals("request_id").(string); ok {
		return id
	}
	return ""
}

// LoggingConfig holds logging middleware configuration
type LoggingConfig struct {
	Logger     *logger.Logger
	SkipPaths  []string
	SlowThreshold time.Duration
}

// Logging creates request logging middleware
func Logging(cfg LoggingConfig) fiber.Handler {
	if cfg.SlowThreshold == 0 {
		cfg.SlowThreshold = 500 * time.Millisecond
	}

	return func(c *fiber.Ctx) error {
		// Skip logging for certain paths
		path := c.Path()
		for _, skipPath := range cfg.SkipPaths {
			if path == skipPath {
				return c.Next()
			}
		}

		start := time.Now()

		// Process request
		err := c.Next()

		// Calculate duration
		duration := time.Since(start)
		status := c.Response().StatusCode()

		// Build log attributes
		attrs := []any{
			slog.String("method", c.Method()),
			slog.String("path", path),
			slog.Int("status", status),
			slog.Duration("duration", duration),
			slog.String("ip", c.IP()),
		}

		// Add request ID if present
		if requestID := GetRequestID(c); requestID != "" {
			attrs = append(attrs, slog.String("request_id", requestID))
		}

		// Add user ID if authenticated
		if telegramID := GetTelegramID(c); telegramID > 0 {
			attrs = append(attrs, slog.Int64("telegram_id", telegramID))
		}

		// Add error if present
		if err != nil {
			attrs = append(attrs, slog.String("error", err.Error()))
		}

		// Log based on status and duration
		switch {
		case status >= 500:
			cfg.Logger.Error("request failed", attrs...)
		case status >= 400:
			cfg.Logger.Warn("request error", attrs...)
		case duration > cfg.SlowThreshold:
			cfg.Logger.Warn("slow request", attrs...)
		default:
			cfg.Logger.Info("request completed", attrs...)
		}

		return err
	}
}
