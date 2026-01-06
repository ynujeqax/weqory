package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/weqory/backend/internal/api/dto"
	"github.com/weqory/backend/internal/api/middleware"
	"github.com/weqory/backend/internal/service"
	"github.com/weqory/backend/pkg/errors"
)

// HistoryHandler handles history endpoints
type HistoryHandler struct {
	historyService *service.HistoryService
}

// NewHistoryHandler creates a new HistoryHandler
func NewHistoryHandler(historyService *service.HistoryService) *HistoryHandler {
	return &HistoryHandler{
		historyService: historyService,
	}
}

// GetHistory handles GET /api/v1/history
func (h *HistoryHandler) GetHistory(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return sendError(c, errors.ErrUnauthorized)
	}

	limit := c.QueryInt("limit", 50)
	offset := c.QueryInt("offset", 0)

	if limit > 100 {
		limit = 100
	}

	history, total, err := h.historyService.GetByUserID(c.Context(), userID, limit, offset)
	if err != nil {
		return sendError(c, err)
	}

	retentionDays, err := h.historyService.GetRetentionDays(c.Context(), userID)
	if err != nil {
		return sendError(c, err)
	}

	// Convert to response
	responseItems := make([]dto.AlertHistoryResponse, len(history))
	for i, item := range history {
		triggeredAt, _ := time.Parse(time.RFC3339, item.TriggeredAt)
		responseItems[i] = dto.AlertHistoryResponse{
			ID:                 item.ID,
			Coin:               toCoinResponse(&item.Coin),
			AlertType:          item.AlertType,
			ConditionOperator:  item.ConditionOperator,
			ConditionValue:     item.ConditionValue,
			ConditionTimeframe: item.ConditionTimeframe,
			TriggeredPrice:     item.TriggeredPrice,
			TriggeredAt:        triggeredAt,
		}
	}

	return c.JSON(dto.HistoryResponse{
		Items:         responseItems,
		Total:         total,
		RetentionDays: retentionDays,
	})
}
