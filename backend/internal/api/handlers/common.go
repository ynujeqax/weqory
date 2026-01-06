package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/weqory/backend/internal/api/dto"
	"github.com/weqory/backend/internal/service"
	"github.com/weqory/backend/pkg/errors"
	"github.com/weqory/backend/pkg/validator"
)

// sendError sends an error response
func sendError(c *fiber.Ctx, err error) error {
	statusCode := errors.GetStatusCode(err)
	return c.Status(statusCode).JSON(dto.ErrorResponse{
		Error: err.Error(),
	})
}

// sendValidationError sends a validation error response
func sendValidationError(c *fiber.Ctx, errs []validator.ValidationError) error {
	return c.Status(fiber.StatusBadRequest).JSON(dto.ErrorResponse{
		Error:   "Validation failed",
		Details: errs,
	})
}

// toCoinResponse converts service.Coin to dto.CoinResponse
func toCoinResponse(c *service.Coin) *dto.CoinResponse {
	if c == nil {
		return nil
	}
	return &dto.CoinResponse{
		ID:               c.ID,
		Symbol:           c.Symbol,
		Name:             c.Name,
		BinanceSymbol:    c.BinanceSymbol,
		Rank:             c.Rank,
		CurrentPrice:     c.CurrentPrice,
		MarketCap:        c.MarketCap,
		Volume24h:        c.Volume24h,
		PriceChange24hPct: c.PriceChange24hPct,
	}
}
