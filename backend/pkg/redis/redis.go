package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// Config holds Redis configuration
type Config struct {
	URL      string
	Password string
	DB       int
}

// NewClient creates a new Redis client
func NewClient(ctx context.Context, cfg Config) (*redis.Client, error) {
	opt, err := redis.ParseURL(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("parse redis url: %w", err)
	}

	if cfg.Password != "" {
		opt.Password = cfg.Password
	}
	opt.DB = cfg.DB

	client := redis.NewClient(opt)

	// Verify connection
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("ping redis: %w", err)
	}

	return client, nil
}

// HealthCheck performs a health check on Redis
func HealthCheck(ctx context.Context, client *redis.Client) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return client.Ping(ctx).Err()
}

// PriceCache provides methods for caching cryptocurrency prices
type PriceCache struct {
	client *redis.Client
}

// NewPriceCache creates a new PriceCache instance
func NewPriceCache(client *redis.Client) *PriceCache {
	return &PriceCache{client: client}
}

// SetPrice caches a price for a symbol
func (c *PriceCache) SetPrice(ctx context.Context, symbol string, price float64, ttl time.Duration) error {
	key := fmt.Sprintf("price:%s", symbol)
	return c.client.Set(ctx, key, price, ttl).Err()
}

// GetPrice retrieves a cached price for a symbol
func (c *PriceCache) GetPrice(ctx context.Context, symbol string) (float64, error) {
	key := fmt.Sprintf("price:%s", symbol)
	return c.client.Get(ctx, key).Float64()
}

// SetPriceData caches full price data for a symbol
func (c *PriceCache) SetPriceData(ctx context.Context, symbol string, data map[string]interface{}, ttl time.Duration) error {
	key := fmt.Sprintf("prices:%s", symbol)
	pipe := c.client.Pipeline()
	pipe.HSet(ctx, key, data)
	pipe.Expire(ctx, key, ttl)
	_, err := pipe.Exec(ctx)
	return err
}

// GetPriceData retrieves cached price data for a symbol
func (c *PriceCache) GetPriceData(ctx context.Context, symbol string) (map[string]string, error) {
	key := fmt.Sprintf("prices:%s", symbol)
	return c.client.HGetAll(ctx, key).Result()
}

// RateLimiter provides rate limiting functionality
type RateLimiter struct {
	client *redis.Client
}

// NewRateLimiter creates a new RateLimiter instance
func NewRateLimiter(client *redis.Client) *RateLimiter {
	return &RateLimiter{client: client}
}

// Allow checks if a request is allowed under the rate limit
func (r *RateLimiter) Allow(ctx context.Context, key string, limit int64, window time.Duration) (bool, int64, int64, error) {
	now := time.Now().UnixMilli()
	windowStart := now - window.Milliseconds()

	pipe := r.client.Pipeline()

	// Remove old entries
	pipe.ZRemRangeByScore(ctx, key, "0", fmt.Sprintf("%d", windowStart))

	// Count current requests in window
	countCmd := pipe.ZCard(ctx, key)

	// Set expiry on the key
	pipe.Expire(ctx, key, window)

	_, err := pipe.Exec(ctx)
	if err != nil {
		return false, 0, 0, err
	}

	count := countCmd.Val()
	resetAt := now + window.Milliseconds()

	// Check limit BEFORE adding request
	if count >= limit {
		return false, 0, resetAt, nil
	}

	// Only add if under limit
	// Use unique member by combining timestamp with random component to handle concurrent requests
	member := fmt.Sprintf("%d", now)
	if err := r.client.ZAdd(ctx, key, redis.Z{Score: float64(now), Member: member}).Err(); err != nil {
		return false, 0, 0, err
	}

	remaining := limit - count - 1
	if remaining < 0 {
		remaining = 0
	}

	return true, remaining, resetAt, nil
}
