package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/weqory/backend/internal/api/dto"
	"github.com/weqory/backend/internal/api/middleware"
	"github.com/weqory/backend/internal/service"
	"github.com/weqory/backend/pkg/errors"
	"github.com/weqory/backend/pkg/validator"
)

// UserHandler handles user endpoints
type UserHandler struct {
	userService      *service.UserService
	watchlistService *service.WatchlistService
	alertService     *service.AlertService
	historyService   *service.HistoryService
	validator        *validator.Validator
}

// NewUserHandler creates a new UserHandler
func NewUserHandler(
	userService *service.UserService,
	watchlistService *service.WatchlistService,
	alertService *service.AlertService,
	historyService *service.HistoryService,
	validator *validator.Validator,
) *UserHandler {
	return &UserHandler{
		userService:      userService,
		watchlistService: watchlistService,
		alertService:     alertService,
		historyService:   historyService,
		validator:        validator,
	}
}

// GetMe handles GET /api/v1/users/me
func (h *UserHandler) GetMe(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return sendError(c, errors.ErrUnauthorized)
	}

	user, err := h.userService.GetWithLimits(c.Context(), userID)
	if err != nil {
		return sendError(c, err)
	}

	return c.JSON(toUserResponse(user))
}

// UpdateSettings handles PATCH /api/v1/users/me/settings
func (h *UserHandler) UpdateSettings(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return sendError(c, errors.ErrUnauthorized)
	}

	var req dto.UpdateSettingsRequest
	if err := c.BodyParser(&req); err != nil {
		return sendError(c, errors.ErrBadRequest.WithMessage("Invalid request body"))
	}

	user, err := h.userService.UpdateSettings(c.Context(), userID, req.NotificationsEnabled, req.VibrationEnabled)
	if err != nil {
		return sendError(c, err)
	}

	return c.JSON(toSimpleUserResponse(user))
}

// DeleteWatchlist handles DELETE /api/v1/users/me/watchlist
func (h *UserHandler) DeleteWatchlist(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return sendError(c, errors.ErrUnauthorized)
	}

	deleted, err := h.watchlistService.DeleteAllByUser(c.Context(), userID)
	if err != nil {
		return sendError(c, err)
	}

	return c.JSON(fiber.Map{
		"deleted_count": deleted,
		"message":       "Watchlist cleared successfully",
	})
}

// DeleteAlerts handles DELETE /api/v1/users/me/alerts
func (h *UserHandler) DeleteAlerts(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return sendError(c, errors.ErrUnauthorized)
	}

	deleted, err := h.alertService.DeleteAllByUser(c.Context(), userID)
	if err != nil {
		return sendError(c, err)
	}

	return c.JSON(fiber.Map{
		"deleted_count": deleted,
		"message":       "All alerts deleted successfully",
	})
}

// DeleteHistory handles DELETE /api/v1/users/me/history
func (h *UserHandler) DeleteHistory(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return sendError(c, errors.ErrUnauthorized)
	}

	deleted, err := h.historyService.DeleteAllByUser(c.Context(), userID)
	if err != nil {
		return sendError(c, err)
	}

	return c.JSON(fiber.Map{
		"deleted_count": deleted,
		"message":       "History cleared successfully",
	})
}

func toSimpleUserResponse(u *service.User) *dto.UserResponse {
	if u == nil {
		return nil
	}

	return &dto.UserResponse{
		ID:                   u.ID,
		TelegramID:           u.TelegramID,
		Username:             u.Username,
		FirstName:            u.FirstName,
		LastName:             u.LastName,
		LanguageCode:         u.LanguageCode,
		Plan:                 u.Plan,
		NotificationsUsed:    u.NotificationsUsed,
		NotificationsEnabled: u.NotificationsEnabled,
		VibrationEnabled:     u.VibrationEnabled,
	}
}
