package alert

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/weqory/backend/internal/binance"
)

const (
	// Redis channel for price stream updates
	priceStreamChannel = "prices:stream"

	// Throttle interval per symbol (avoid flooding)
	priceThrottleInterval = 500 * time.Millisecond
)

// PriceStreamPayload represents the price update sent to API Gateway
type PriceStreamPayload struct {
	Symbol       string  `json:"symbol"`
	Price        float64 `json:"price"`
	Change24hPct float64 `json:"change24hPct"`
	Volume24h    float64 `json:"volume24h"`
	UpdatedAt    string  `json:"updatedAt"`
}

// PricePublisher publishes price updates to Redis for WebSocket clients
type PricePublisher struct {
	client *redis.Client
	logger *slog.Logger

	// Throttling: track last publish time per symbol
	lastPublish map[string]time.Time
	mu          sync.RWMutex
}

// NewPricePublisher creates a new price publisher
func NewPricePublisher(client *redis.Client, logger *slog.Logger) *PricePublisher {
	return &PricePublisher{
		client:      client,
		logger:      logger,
		lastPublish: make(map[string]time.Time),
	}
}

// Publish publishes a price update to Redis pub/sub
func (p *PricePublisher) Publish(ctx context.Context, data binance.PriceData) {
	// Check throttle
	if !p.shouldPublish(data.Symbol) {
		return
	}

	payload := PriceStreamPayload{
		Symbol:       data.Symbol,
		Price:        data.Price,
		Change24hPct: data.ChangePercent,
		Volume24h:    data.Volume24h,
		UpdatedAt:    data.UpdatedAt.UTC().Format(time.RFC3339),
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		p.logger.Error("failed to marshal price payload",
			slog.String("symbol", data.Symbol),
			slog.String("error", err.Error()),
		)
		return
	}

	// Publish to Redis pub/sub channel
	if err := p.client.Publish(ctx, priceStreamChannel, jsonData).Err(); err != nil {
		p.logger.Error("failed to publish price update",
			slog.String("symbol", data.Symbol),
			slog.String("error", err.Error()),
		)
		return
	}

	p.logger.Debug("published price update",
		slog.String("symbol", data.Symbol),
		slog.Float64("price", data.Price),
	)
}

// shouldPublish checks if we should publish for this symbol (throttling)
func (p *PricePublisher) shouldPublish(symbol string) bool {
	p.mu.Lock()
	defer p.mu.Unlock()

	now := time.Now()
	last, exists := p.lastPublish[symbol]

	if !exists || now.Sub(last) >= priceThrottleInterval {
		p.lastPublish[symbol] = now
		return true
	}

	return false
}

// GetChannel returns the Redis channel name for price streams
func GetPriceStreamChannel() string {
	return priceStreamChannel
}
