package handlers

import (
	"log/slog"

	"github.com/gofiber/fiber/v2"
	"github.com/weqory/backend/internal/api/dto"
	"github.com/weqory/backend/internal/service"
	"github.com/weqory/backend/pkg/errors"
	"github.com/weqory/backend/pkg/validator"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	authService *service.AuthService
	validator   *validator.Validator
}

// NewAuthHandler creates a new AuthHandler
func NewAuthHandler(authService *service.AuthService, validator *validator.Validator) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		validator:   validator,
	}
}

// Authenticate handles POST /api/v1/auth/telegram
func (h *AuthHandler) Authenticate(c *fiber.Ctx) error {
	var req dto.AuthRequest
	if err := c.BodyParser(&req); err != nil {
		return sendError(c, errors.ErrBadRequest.WithMessage("Invalid request body"))
	}

	if errs := h.validator.Validate(req); errs != nil {
		return sendValidationError(c, errs)
	}

	result, err := h.authService.Authenticate(c.Context(), req.InitData)
	if err != nil {
		slog.Error("auth failed", slog.String("error", err.Error()), slog.String("init_data_length", string(rune(len(req.InitData)))))
		return sendError(c, err)
	}

	return c.JSON(dto.AuthResponse{
		User:  toUserResponse(result.User),
		Token: result.Token,
	})
}

func toUserResponse(u *service.UserWithLimits) *dto.UserResponse {
	if u == nil {
		return nil
	}

	resp := &dto.UserResponse{
		ID:                   u.ID,
		TelegramID:           u.TelegramID,
		Username:             u.Username,
		FirstName:            u.FirstName,
		LastName:             u.LastName,
		LanguageCode:         u.LanguageCode,
		Plan:                 u.Plan,
		PlanExpiresAt:        u.PlanExpiresAt,
		PlanPeriod:           u.PlanPeriod,
		NotificationsUsed:    u.NotificationsUsed,
		NotificationsResetAt: u.NotificationsResetAt,
		NotificationsEnabled: u.NotificationsEnabled,
		VibrationEnabled:     u.VibrationEnabled,
		CreatedAt:            u.CreatedAt,
		LastActiveAt:         u.LastActiveAt,
		Limits: &dto.UserLimits{
			MaxCoins:             u.MaxCoins,
			MaxAlerts:            u.MaxAlerts,
			MaxNotifications:     u.MaxNotifications,
			HistoryRetentionDays: u.HistoryRetentionDays,
			CoinsUsed:            u.CoinsUsed,
			AlertsUsed:           u.AlertsUsed,
		},
	}

	return resp
}
