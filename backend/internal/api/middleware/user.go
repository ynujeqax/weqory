package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/weqory/backend/pkg/errors"
)

// UserIDKey is the context key for user ID
const UserIDKey = "user_id"

// SetUserID stores the database user ID in context
func SetUserID(c *fiber.Ctx, userID int64) {
	c.Locals(UserIDKey, userID)
}

// GetUserID retrieves the database user ID from context
func GetUserID(c *fiber.Ctx) int64 {
	if id, ok := c.Locals(UserIDKey).(int64); ok {
		return id
	}
	return 0
}

// RequireUser ensures a user ID is present in context
func RequireUser() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if GetUserID(c) == 0 {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": errors.ErrUnauthorized.Error(),
			})
		}
		return c.Next()
	}
}
