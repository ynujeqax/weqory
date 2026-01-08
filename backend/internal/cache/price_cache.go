package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/weqory/backend/internal/binance"
)

const (
	priceKeyPrefix      = "price:"
	priceHistoryPrefix  = "price_history:"
	volumeHistoryPrefix = "volume_history:"
	priceTTL            = 5 * time.Minute
	historyTTL          = 24 * time.Hour
	volumeHistoryTTL    = 7 * 24 * time.Hour // 7 days for volume history
	historyMaxLen       = 1440               // 24 hours of minute data
	volumeHistoryMaxLen = 168                // 7 days of hourly data
)

// PriceCache handles price caching in Redis
type PriceCache struct {
	client *redis.Client
	logger *slog.Logger
}

// NewPriceCache creates a new PriceCache
func NewPriceCache(client *redis.Client, logger *slog.Logger) *PriceCache {
	return &PriceCache{
		client: client,
		logger: logger,
	}
}

// Set stores a price in cache
func (c *PriceCache) Set(ctx context.Context, data binance.PriceData) error {
	key := priceKeyPrefix + data.Symbol

	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal price data: %w", err)
	}

	if err := c.client.Set(ctx, key, jsonData, priceTTL).Err(); err != nil {
		return fmt.Errorf("failed to set price in cache: %w", err)
	}

	return nil
}

// Get retrieves a price from cache
func (c *PriceCache) Get(ctx context.Context, symbol string) (*binance.PriceData, error) {
	key := priceKeyPrefix + symbol

	data, err := c.client.Get(ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get price from cache: %w", err)
	}

	var priceData binance.PriceData
	if err := json.Unmarshal(data, &priceData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal price data: %w", err)
	}

	return &priceData, nil
}

// GetMultiple retrieves multiple prices from cache
func (c *PriceCache) GetMultiple(ctx context.Context, symbols []string) (map[string]*binance.PriceData, error) {
	if len(symbols) == 0 {
		return make(map[string]*binance.PriceData), nil
	}

	keys := make([]string, len(symbols))
	for i, s := range symbols {
		keys[i] = priceKeyPrefix + s
	}

	results, err := c.client.MGet(ctx, keys...).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get prices from cache: %w", err)
	}

	prices := make(map[string]*binance.PriceData)
	for i, result := range results {
		if result == nil {
			continue
		}

		data, ok := result.(string)
		if !ok {
			continue
		}

		var priceData binance.PriceData
		if err := json.Unmarshal([]byte(data), &priceData); err != nil {
			c.logger.Error("failed to unmarshal price data",
				slog.String("symbol", symbols[i]),
				slog.String("error", err.Error()),
			)
			continue
		}

		prices[symbols[i]] = &priceData
	}

	return prices, nil
}

// SetMultiple stores multiple prices in cache using pipeline
func (c *PriceCache) SetMultiple(ctx context.Context, prices []binance.PriceData) error {
	if len(prices) == 0 {
		return nil
	}

	pipe := c.client.Pipeline()

	for _, data := range prices {
		key := priceKeyPrefix + data.Symbol
		jsonData, err := json.Marshal(data)
		if err != nil {
			c.logger.Error("failed to marshal price data",
				slog.String("symbol", data.Symbol),
				slog.String("error", err.Error()),
			)
			continue
		}
		pipe.Set(ctx, key, jsonData, priceTTL)
	}

	_, err := pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to set prices in cache: %w", err)
	}

	return nil
}

// AddToHistory adds a price point to the historical data
func (c *PriceCache) AddToHistory(ctx context.Context, symbol string, price float64, timestamp time.Time) error {
	key := priceHistoryPrefix + symbol

	// Store as JSON with timestamp and price
	entry := fmt.Sprintf(`{"t":%d,"p":%f}`, timestamp.Unix(), price)

	pipe := c.client.Pipeline()
	pipe.LPush(ctx, key, entry)
	pipe.LTrim(ctx, key, 0, historyMaxLen-1)
	pipe.Expire(ctx, key, historyTTL)

	_, err := pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to add price to history: %w", err)
	}

	return nil
}

// PriceHistoryEntry represents a historical price point
type PriceHistoryEntry struct {
	Timestamp int64   `json:"t"`
	Price     float64 `json:"p"`
}

// GetHistory retrieves price history for a symbol
func (c *PriceCache) GetHistory(ctx context.Context, symbol string, limit int64) ([]PriceHistoryEntry, error) {
	key := priceHistoryPrefix + symbol

	if limit <= 0 || limit > historyMaxLen {
		limit = historyMaxLen
	}

	results, err := c.client.LRange(ctx, key, 0, limit-1).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get price history: %w", err)
	}

	history := make([]PriceHistoryEntry, 0, len(results))
	for _, result := range results {
		var entry PriceHistoryEntry
		if err := json.Unmarshal([]byte(result), &entry); err != nil {
			continue
		}
		history = append(history, entry)
	}

	return history, nil
}

// GetPriceChange calculates price change over a timeframe
func (c *PriceCache) GetPriceChange(ctx context.Context, symbol string, duration time.Duration) (float64, error) {
	history, err := c.GetHistory(ctx, symbol, historyMaxLen)
	if err != nil {
		return 0, err
	}

	if len(history) == 0 {
		return 0, nil
	}

	currentPrice := history[0].Price
	targetTime := time.Now().Add(-duration).Unix()

	// Find the price closest to the target time
	var oldPrice float64
	for _, entry := range history {
		if entry.Timestamp <= targetTime {
			oldPrice = entry.Price
			break
		}
		oldPrice = entry.Price // Use oldest available if not enough history
	}

	if oldPrice == 0 {
		return 0, nil
	}

	return ((currentPrice - oldPrice) / oldPrice) * 100, nil
}

// Delete removes a price from cache
func (c *PriceCache) Delete(ctx context.Context, symbol string) error {
	key := priceKeyPrefix + symbol
	return c.client.Del(ctx, key).Err()
}

// GetAllSymbols returns all cached symbols using SCAN (non-blocking)
func (c *PriceCache) GetAllSymbols(ctx context.Context) ([]string, error) {
	pattern := priceKeyPrefix + "*"
	var symbols []string
	prefixLen := len(priceKeyPrefix)

	// Use SCAN instead of KEYS to avoid blocking Redis
	iter := c.client.Scan(ctx, 0, pattern, 100).Iterator()
	for iter.Next(ctx) {
		key := iter.Val()
		if len(key) > prefixLen {
			symbols = append(symbols, key[prefixLen:])
		}
	}

	if err := iter.Err(); err != nil {
		return nil, fmt.Errorf("failed to scan cached symbols: %w", err)
	}

	return symbols, nil
}

// VolumeHistoryEntry represents a historical volume point
type VolumeHistoryEntry struct {
	Timestamp int64   `json:"t"`
	Volume    float64 `json:"v"`
}

// AddToVolumeHistory adds a volume point to the historical data (hourly)
func (c *PriceCache) AddToVolumeHistory(ctx context.Context, symbol string, volume float64, timestamp time.Time) error {
	key := volumeHistoryPrefix + symbol

	// Store as JSON with timestamp and volume
	entry := fmt.Sprintf(`{"t":%d,"v":%f}`, timestamp.Unix(), volume)

	pipe := c.client.Pipeline()
	pipe.LPush(ctx, key, entry)
	pipe.LTrim(ctx, key, 0, volumeHistoryMaxLen-1)
	pipe.Expire(ctx, key, volumeHistoryTTL)

	_, err := pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to add volume to history: %w", err)
	}

	return nil
}

// GetVolumeHistory retrieves volume history for a symbol
func (c *PriceCache) GetVolumeHistory(ctx context.Context, symbol string, limit int64) ([]VolumeHistoryEntry, error) {
	key := volumeHistoryPrefix + symbol

	if limit <= 0 || limit > volumeHistoryMaxLen {
		limit = volumeHistoryMaxLen
	}

	results, err := c.client.LRange(ctx, key, 0, limit-1).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get volume history: %w", err)
	}

	history := make([]VolumeHistoryEntry, 0, len(results))
	for _, result := range results {
		var entry VolumeHistoryEntry
		if err := json.Unmarshal([]byte(result), &entry); err != nil {
			continue
		}
		history = append(history, entry)
	}

	return history, nil
}

// GetAverageVolume calculates average volume over a duration
func (c *PriceCache) GetAverageVolume(ctx context.Context, symbol string, duration time.Duration) (float64, error) {
	history, err := c.GetVolumeHistory(ctx, symbol, volumeHistoryMaxLen)
	if err != nil {
		return 0, err
	}

	if len(history) == 0 {
		return 0, fmt.Errorf("no volume history available")
	}

	targetTime := time.Now().Add(-duration).Unix()

	var totalVolume float64
	var count int
	for _, entry := range history {
		if entry.Timestamp >= targetTime {
			totalVolume += entry.Volume
			count++
		}
	}

	if count == 0 {
		return 0, fmt.Errorf("no volume data in timeframe")
	}

	return totalVolume / float64(count), nil
}

// GetVolumeChange calculates volume change percentage over a timeframe
func (c *PriceCache) GetVolumeChange(ctx context.Context, symbol string, duration time.Duration) (float64, error) {
	history, err := c.GetVolumeHistory(ctx, symbol, volumeHistoryMaxLen)
	if err != nil {
		return 0, err
	}

	if len(history) == 0 {
		return 0, fmt.Errorf("no volume history available")
	}

	currentVolume := history[0].Volume
	targetTime := time.Now().Add(-duration).Unix()

	// Find the volume closest to the target time
	var oldVolume float64
	for _, entry := range history {
		if entry.Timestamp <= targetTime {
			oldVolume = entry.Volume
			break
		}
		oldVolume = entry.Volume // Use oldest available if not enough history
	}

	if oldVolume == 0 {
		return 0, fmt.Errorf("no old volume data available")
	}

	return ((currentVolume - oldVolume) / oldVolume) * 100, nil
}
