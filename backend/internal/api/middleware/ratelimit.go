package middleware

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/weqory/backend/pkg/errors"
	pkgredis "github.com/weqory/backend/pkg/redis"
)

// RateLimitConfig holds rate limiting configuration
type RateLimitConfig struct {
	Limiter       *pkgredis.RateLimiter
	MaxRequests   int64
	WindowSeconds int64
	KeyPrefix     string
}

// RateLimit creates rate limiting middleware
func RateLimit(cfg RateLimitConfig) fiber.Handler {
	window := time.Duration(cfg.WindowSeconds) * time.Second

	return func(c *fiber.Ctx) error {
		// Get user identifier (Telegram ID or IP)
		var identifier string
		if telegramID := GetTelegramID(c); telegramID > 0 {
			identifier = fmt.Sprintf("user:%d", telegramID)
		} else {
			identifier = fmt.Sprintf("ip:%s", c.IP())
		}

		key := fmt.Sprintf("%s:%s", cfg.KeyPrefix, identifier)

		allowed, remaining, resetAt, err := cfg.Limiter.Allow(
			c.Context(),
			key,
			cfg.MaxRequests,
			window,
		)
		if err != nil {
			// On Redis error, allow request but log warning
			return c.Next()
		}

		// Set rate limit headers
		c.Set("X-RateLimit-Limit", strconv.FormatInt(cfg.MaxRequests, 10))
		c.Set("X-RateLimit-Remaining", strconv.FormatInt(remaining, 10))
		c.Set("X-RateLimit-Reset", strconv.FormatInt(resetAt/1000, 10))

		if !allowed {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":      errors.ErrTooManyRequests.Error(),
				"retry_after": cfg.WindowSeconds,
			})
		}

		return c.Next()
	}
}

// RateLimitByEndpoint creates endpoint-specific rate limiting
func RateLimitByEndpoint(cfg RateLimitConfig) fiber.Handler {
	window := time.Duration(cfg.WindowSeconds) * time.Second

	return func(c *fiber.Ctx) error {
		var identifier string
		if telegramID := GetTelegramID(c); telegramID > 0 {
			identifier = fmt.Sprintf("user:%d", telegramID)
		} else {
			identifier = fmt.Sprintf("ip:%s", c.IP())
		}

		// Include method and path in key for endpoint-specific limiting
		key := fmt.Sprintf("%s:%s:%s:%s", cfg.KeyPrefix, identifier, c.Method(), c.Path())

		allowed, remaining, resetAt, err := cfg.Limiter.Allow(
			c.Context(),
			key,
			cfg.MaxRequests,
			window,
		)
		if err != nil {
			return c.Next()
		}

		c.Set("X-RateLimit-Limit", strconv.FormatInt(cfg.MaxRequests, 10))
		c.Set("X-RateLimit-Remaining", strconv.FormatInt(remaining, 10))
		c.Set("X-RateLimit-Reset", strconv.FormatInt(resetAt/1000, 10))

		if !allowed {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":       errors.ErrTooManyRequests.Error(),
				"retry_after": cfg.WindowSeconds,
			})
		}

		return c.Next()
	}
}
