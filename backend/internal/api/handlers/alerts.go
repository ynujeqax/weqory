package handlers

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/weqory/backend/internal/api/dto"
	"github.com/weqory/backend/internal/api/middleware"
	"github.com/weqory/backend/internal/service"
	"github.com/weqory/backend/pkg/errors"
	"github.com/weqory/backend/pkg/validator"
)

// AlertsHandler handles alert endpoints
type AlertsHandler struct {
	alertService *service.AlertService
	userService  *service.UserService
	validator    *validator.Validator
}

// NewAlertsHandler creates a new AlertsHandler
func NewAlertsHandler(
	alertService *service.AlertService,
	userService *service.UserService,
	validator *validator.Validator,
) *AlertsHandler {
	return &AlertsHandler{
		alertService: alertService,
		userService:  userService,
		validator:    validator,
	}
}

// GetAlerts handles GET /api/v1/alerts
func (h *AlertsHandler) GetAlerts(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return sendError(c, errors.ErrUnauthorized)
	}

	alerts, err := h.alertService.GetByUserID(c.Context(), userID)
	if err != nil {
		return sendError(c, err)
	}

	// Get user limits
	user, err := h.userService.GetWithLimits(c.Context(), userID)
	if err != nil {
		return sendError(c, err)
	}

	// Convert to response
	responseItems := make([]dto.AlertResponse, len(alerts))
	grouped := make(map[string][]dto.AlertResponse)

	for i, alert := range alerts {
		resp := toAlertResponse(&alert)
		responseItems[i] = resp

		// Group by coin symbol
		symbol := alert.Coin.Symbol
		grouped[symbol] = append(grouped[symbol], resp)
	}

	return c.JSON(dto.AlertsResponse{
		Items:   responseItems,
		Total:   int64(len(alerts)),
		Limit:   user.MaxAlerts,
		Grouped: grouped,
	})
}

// CreateAlert handles POST /api/v1/alerts
func (h *AlertsHandler) CreateAlert(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return sendError(c, errors.ErrUnauthorized)
	}

	var req dto.CreateAlertRequest
	if err := c.BodyParser(&req); err != nil {
		return sendError(c, errors.ErrBadRequest.WithMessage("Invalid request body"))
	}

	if errs := h.validator.Validate(req); errs != nil {
		return sendValidationError(c, errs)
	}

	alert, err := h.alertService.Create(c.Context(), userID, service.CreateAlertParams{
		CoinSymbol:         req.CoinSymbol,
		AlertType:          req.AlertType,
		ConditionValue:     req.ConditionValue,
		ConditionTimeframe: req.ConditionTimeframe,
		IsRecurring:        req.IsRecurring,
		PeriodicInterval:   req.PeriodicInterval,
	})
	if err != nil {
		return sendError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(toAlertResponse(alert))
}

// UpdateAlert handles PATCH /api/v1/alerts/:id/pause
func (h *AlertsHandler) UpdateAlert(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return sendError(c, errors.ErrUnauthorized)
	}

	alertID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return sendError(c, errors.ErrBadRequest.WithMessage("Invalid alert ID"))
	}

	var req dto.UpdateAlertRequest
	if err := c.BodyParser(&req); err != nil {
		return sendError(c, errors.ErrBadRequest.WithMessage("Invalid request body"))
	}

	if req.IsPaused == nil {
		return sendError(c, errors.ErrBadRequest.WithMessage("is_paused is required"))
	}

	alert, err := h.alertService.UpdatePaused(c.Context(), userID, alertID, *req.IsPaused)
	if err != nil {
		return sendError(c, err)
	}

	return c.JSON(toAlertResponse(alert))
}

// DeleteAlert handles DELETE /api/v1/alerts/:id
func (h *AlertsHandler) DeleteAlert(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return sendError(c, errors.ErrUnauthorized)
	}

	alertID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return sendError(c, errors.ErrBadRequest.WithMessage("Invalid alert ID"))
	}

	if err := h.alertService.Delete(c.Context(), userID, alertID); err != nil {
		return sendError(c, err)
	}

	return c.JSON(dto.SuccessResponse{
		Message: "Alert deleted successfully",
	})
}

func toAlertResponse(a *service.Alert) dto.AlertResponse {
	createdAt, _ := time.Parse(time.RFC3339, a.CreatedAt)

	resp := dto.AlertResponse{
		ID:                 a.ID,
		Coin:               toCoinResponse(&a.Coin),
		AlertType:          a.AlertType,
		ConditionOperator:  a.ConditionOperator,
		ConditionValue:     a.ConditionValue,
		ConditionTimeframe: a.ConditionTimeframe,
		IsRecurring:        a.IsRecurring,
		IsPaused:           a.IsPaused,
		PeriodicInterval:   a.PeriodicInterval,
		TimesTriggered:     a.TimesTriggered,
		PriceWhenCreated:   a.PriceWhenCreated,
		CreatedAt:          createdAt,
	}

	if a.LastTriggeredAt != nil {
		t, _ := time.Parse(time.RFC3339, *a.LastTriggeredAt)
		resp.LastTriggeredAt = &t
	}

	return resp
}
