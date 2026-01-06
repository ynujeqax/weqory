package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/weqory/backend/pkg/crypto"
	"github.com/weqory/backend/pkg/errors"
	"github.com/weqory/backend/pkg/logger"
)

// AuthConfig holds authentication middleware configuration
type AuthConfig struct {
	BotToken      string
	Logger        *logger.Logger
	SkipPaths     []string
	DevMode       bool
	DevTelegramID int64
}

// Auth creates authentication middleware that validates Telegram InitData
func Auth(cfg AuthConfig) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Skip authentication for certain paths
		path := c.Path()
		for _, skipPath := range cfg.SkipPaths {
			if strings.HasPrefix(path, skipPath) {
				return c.Next()
			}
		}

		// Get InitData from header
		initData := c.Get("X-Telegram-Init-Data")

		// In development mode, allow requests without InitData
		if cfg.DevMode && initData == "" {
			if cfg.DevTelegramID > 0 {
				c.Locals("telegram_id", cfg.DevTelegramID)
				c.Locals("telegram_user", &crypto.TelegramUser{
					ID:           cfg.DevTelegramID,
					FirstName:    "Dev",
					Username:     "developer",
					LanguageCode: "en",
				})
			}
			return c.Next()
		}

		if initData == "" {
			return sendError(c, errors.ErrUnauthorized.WithMessage("missing telegram init data"))
		}

		// Validate InitData
		data, err := crypto.ValidateInitData(initData, cfg.BotToken)
		if err != nil {
			if cfg.Logger != nil {
				cfg.Logger.Warn("invalid init data",
					"error", err.Error(),
					"path", path,
				)
			}
			return sendError(c, err)
		}

		if data.User == nil {
			return sendError(c, errors.ErrInvalidInitData.WithMessage("missing user data"))
		}

		// Store user info in context
		c.Locals("telegram_id", data.User.ID)
		c.Locals("telegram_user", data.User)
		c.Locals("init_data", data)

		return c.Next()
	}
}

// GetTelegramID retrieves Telegram ID from context
func GetTelegramID(c *fiber.Ctx) int64 {
	if id, ok := c.Locals("telegram_id").(int64); ok {
		return id
	}
	return 0
}

// GetTelegramUser retrieves Telegram user from context
func GetTelegramUser(c *fiber.Ctx) *crypto.TelegramUser {
	if user, ok := c.Locals("telegram_user").(*crypto.TelegramUser); ok {
		return user
	}
	return nil
}

// sendError sends an error response
func sendError(c *fiber.Ctx, err error) error {
	statusCode := errors.GetStatusCode(err)
	return c.Status(statusCode).JSON(fiber.Map{
		"error": err.Error(),
	})
}
