package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/weqory/backend/internal/api/dto"
	"github.com/weqory/backend/internal/api/middleware"
	"github.com/weqory/backend/internal/service"
	"github.com/weqory/backend/pkg/errors"
	"github.com/weqory/backend/pkg/validator"
)

// WatchlistHandler handles watchlist endpoints
type WatchlistHandler struct {
	watchlistService *service.WatchlistService
	userService      *service.UserService
	validator        *validator.Validator
}

// NewWatchlistHandler creates a new WatchlistHandler
func NewWatchlistHandler(
	watchlistService *service.WatchlistService,
	userService *service.UserService,
	validator *validator.Validator,
) *WatchlistHandler {
	return &WatchlistHandler{
		watchlistService: watchlistService,
		userService:      userService,
		validator:        validator,
	}
}

// GetWatchlist handles GET /api/v1/watchlist
func (h *WatchlistHandler) GetWatchlist(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return sendError(c, errors.ErrUnauthorized)
	}

	items, err := h.watchlistService.GetByUserID(c.Context(), userID)
	if err != nil {
		return sendError(c, err)
	}

	// Get user limits
	user, err := h.userService.GetWithLimits(c.Context(), userID)
	if err != nil {
		return sendError(c, err)
	}

	// Convert to response
	responseItems := make([]dto.WatchlistItemResponse, len(items))
	for i, item := range items {
		createdAt, _ := time.Parse(time.RFC3339, item.CreatedAt)
		responseItems[i] = dto.WatchlistItemResponse{
			ID:          item.ID,
			Coin:        toCoinResponse(&item.Coin),
			AlertsCount: item.AlertsCount,
			CreatedAt:   createdAt,
		}
	}

	return c.JSON(dto.WatchlistResponse{
		Items: responseItems,
		Total: len(items),
		Limit: user.MaxCoins,
	})
}

// AddToWatchlist handles POST /api/v1/watchlist
func (h *WatchlistHandler) AddToWatchlist(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return sendError(c, errors.ErrUnauthorized)
	}

	var req dto.AddToWatchlistRequest
	if err := c.BodyParser(&req); err != nil {
		return sendError(c, errors.ErrBadRequest.WithMessage("Invalid request body"))
	}

	if errs := h.validator.Validate(req); errs != nil {
		return sendValidationError(c, errs)
	}

	item, err := h.watchlistService.AddCoin(c.Context(), userID, req.CoinSymbol)
	if err != nil {
		return sendError(c, err)
	}

	createdAt, _ := time.Parse(time.RFC3339, item.CreatedAt)

	return c.Status(fiber.StatusCreated).JSON(dto.AddToWatchlistResponse{
		ID:      item.ID,
		Coin:    toCoinResponse(&item.Coin),
		AddedAt: createdAt,
	})
}

// RemoveFromWatchlist handles DELETE /api/v1/watchlist/:symbol
func (h *WatchlistHandler) RemoveFromWatchlist(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return sendError(c, errors.ErrUnauthorized)
	}

	symbol := c.Params("symbol")
	if symbol == "" {
		return sendError(c, errors.ErrBadRequest.WithMessage("Missing coin symbol"))
	}

	deletedAlerts, err := h.watchlistService.RemoveCoin(c.Context(), userID, symbol)
	if err != nil {
		return sendError(c, err)
	}

	return c.JSON(dto.RemoveFromWatchlistResponse{
		DeletedAlertsCount: deletedAlerts,
	})
}

// GetAvailableCoins handles GET /api/v1/watchlist/available-coins
func (h *WatchlistHandler) GetAvailableCoins(c *fiber.Ctx) error {
	search := c.Query("search", "")
	limit := c.QueryInt("limit", 50)

	if limit > 100 {
		limit = 100
	}

	coins, err := h.watchlistService.GetAvailableCoins(c.Context(), search, limit)
	if err != nil {
		return sendError(c, err)
	}

	response := make([]dto.CoinResponse, len(coins))
	for i, coin := range coins {
		response[i] = *toCoinResponse(&coin)
	}

	return c.JSON(fiber.Map{
		"coins": response,
	})
}
