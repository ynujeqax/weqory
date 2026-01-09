package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/weqory/backend/internal/api/dto"
	"github.com/weqory/backend/internal/service"
	"github.com/weqory/backend/pkg/errors"
)

// MarketHandler handles market endpoints
type MarketHandler struct {
	watchlistService *service.WatchlistService
	httpClient       *http.Client
}

// NewMarketHandler creates a new MarketHandler
func NewMarketHandler(watchlistService *service.WatchlistService) *MarketHandler {
	return &MarketHandler{
		watchlistService: watchlistService,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// GetMarketOverview handles GET /api/v1/market/overview
func (h *MarketHandler) GetMarketOverview(c *fiber.Ctx) error {
	ctx := c.Context()

	// Get top coins from database (100 to have enough for top 20 gainers/losers)
	topCoins, err := h.watchlistService.GetAvailableCoins(ctx, "", 100)
	if err != nil {
		return sendError(c, err)
	}

	// Fetch Fear & Greed Index
	fearGreed, err := h.fetchFearGreedIndex(ctx)
	if err != nil {
		// Don't fail the entire request if Fear & Greed fails
		fearGreed = &dto.FearGreedResponse{
			Value:          50,
			Classification: "Neutral",
		}
	}

	// Build response
	coinResponses := make([]dto.CoinResponse, len(topCoins))
	for i, coin := range topCoins {
		coinResponses[i] = *toCoinResponse(&coin)
	}

	// Calculate market stats from top coins (simplified)
	var totalMarketCap, totalVolume float64
	for _, coin := range topCoins {
		if coin.MarketCap != nil {
			totalMarketCap += *coin.MarketCap
		}
		if coin.Volume24h != nil {
			totalVolume += *coin.Volume24h
		}
	}

	// BTC dominance calculation (simplified)
	btcDominance := 0.0
	ethDominance := 0.0
	if len(topCoins) > 0 && topCoins[0].MarketCap != nil && totalMarketCap > 0 {
		btcDominance = (*topCoins[0].MarketCap / totalMarketCap) * 100
	}
	if len(topCoins) > 1 && topCoins[1].MarketCap != nil && totalMarketCap > 0 {
		ethDominance = (*topCoins[1].MarketCap / totalMarketCap) * 100
	}

	return c.JSON(dto.MarketOverviewResponse{
		TotalMarketCap:        totalMarketCap,
		TotalVolume24h:        totalVolume,
		BTCDominance:          btcDominance,
		ETHDominance:          ethDominance,
		MarketCapChange24hPct: 0, // Would need historical data
		FearGreedIndex:        fearGreed,
		TopCoins:              coinResponses,
	})
}

// fetchFearGreedIndex fetches the Fear & Greed Index from alternative.me API
func (h *MarketHandler) fetchFearGreedIndex(ctx context.Context) (*dto.FearGreedResponse, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", "https://api.alternative.me/fng/?limit=1", nil)
	if err != nil {
		return nil, err
	}

	resp, err := h.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("fear greed API returned status %d", resp.StatusCode)
	}

	var result struct {
		Data []struct {
			Value               string `json:"value"`
			ValueClassification string `json:"value_classification"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	if len(result.Data) == 0 {
		return nil, errors.ErrExternalService
	}

	var value int
	fmt.Sscanf(result.Data[0].Value, "%d", &value)

	return &dto.FearGreedResponse{
		Value:          value,
		Classification: result.Data[0].ValueClassification,
	}, nil
}
