package websocket

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	// Redis channel for price stream updates (must match alert package)
	priceStreamChannel = "prices:stream"

	// Reconnect delay on subscription error
	reconnectDelay = time.Second
	maxReconnectDelay = 30 * time.Second
)

// PriceStreamPayload matches the payload from alert.PricePublisher
type PriceStreamPayload struct {
	Symbol       string  `json:"symbol"`
	Price        float64 `json:"price"`
	Change24hPct float64 `json:"change24hPct"`
	Volume24h    float64 `json:"volume24h"`
	UpdatedAt    string  `json:"updatedAt"`
}

// PriceSubscriber subscribes to Redis pub/sub and forwards prices to WebSocket hub
type PriceSubscriber struct {
	client *redis.Client
	hub    *Hub
	logger *slog.Logger
}

// NewPriceSubscriber creates a new price subscriber
func NewPriceSubscriber(client *redis.Client, hub *Hub, logger *slog.Logger) *PriceSubscriber {
	return &PriceSubscriber{
		client: client,
		hub:    hub,
		logger: logger,
	}
}

// Subscribe starts listening to price updates from Redis and broadcasts to WebSocket clients
func (s *PriceSubscriber) Subscribe(ctx context.Context) error {
	backoff := reconnectDelay

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		err := s.subscribeLoop(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return ctx.Err()
			}

			s.logger.Error("price subscription error, reconnecting",
				slog.String("error", err.Error()),
				slog.Duration("retry_in", backoff),
			)

			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(backoff):
			}

			// Exponential backoff
			backoff = min(backoff*2, maxReconnectDelay)
			continue
		}

		// Reset backoff on successful subscription
		backoff = reconnectDelay
	}
}

// subscribeLoop handles the actual subscription and message processing
func (s *PriceSubscriber) subscribeLoop(ctx context.Context) error {
	pubsub := s.client.Subscribe(ctx, priceStreamChannel)
	defer pubsub.Close()

	// Wait for subscription confirmation
	if _, err := pubsub.Receive(ctx); err != nil {
		return err
	}

	s.logger.Info("subscribed to price stream", slog.String("channel", priceStreamChannel))

	ch := pubsub.Channel()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()

		case msg, ok := <-ch:
			if !ok {
				return nil // Channel closed
			}

			s.handleMessage(msg)
		}
	}
}

// handleMessage processes a single price update message
func (s *PriceSubscriber) handleMessage(msg *redis.Message) {
	var payload PriceStreamPayload
	if err := json.Unmarshal([]byte(msg.Payload), &payload); err != nil {
		s.logger.Error("failed to unmarshal price update",
			slog.String("error", err.Error()),
		)
		return
	}

	// Convert to hub's PriceUpdate format and broadcast
	update := PriceUpdate{
		Symbol:       payload.Symbol,
		Price:        payload.Price,
		Change24hPct: payload.Change24hPct,
		Volume24h:    payload.Volume24h,
		UpdatedAt:    payload.UpdatedAt,
	}

	s.hub.BroadcastPrice(update)
}
