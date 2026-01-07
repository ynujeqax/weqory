package websocket

import (
	"context"
	"encoding/json"
	"log/slog"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockHub tracks BroadcastPrice calls for testing
type mockHub struct {
	*Hub
	broadcasts []PriceUpdate
	mu         sync.Mutex
}

func newMockHub() *mockHub {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	return &mockHub{
		Hub:        NewHub(logger),
		broadcasts: make([]PriceUpdate, 0),
	}
}

func (h *mockHub) BroadcastPrice(update PriceUpdate) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.broadcasts = append(h.broadcasts, update)
}

func (h *mockHub) getBroadcasts() []PriceUpdate {
	h.mu.Lock()
	defer h.mu.Unlock()
	result := make([]PriceUpdate, len(h.broadcasts))
	copy(result, h.broadcasts)
	return result
}

func newTestPriceSubscriber(t *testing.T) (*PriceSubscriber, *redis.Client, *mockHub) {
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})

	ctx := context.Background()
	if err := redisClient.Ping(ctx).Err(); err != nil {
		t.Skip("Redis not available, skipping integration test")
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	hub := newMockHub()
	subscriber := NewPriceSubscriber(redisClient, hub.Hub, logger)

	return subscriber, redisClient, hub
}

func TestPriceSubscriber_ReceivesMessages(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	subscriber, redisClient, hub := newTestPriceSubscriber(t)
	defer redisClient.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Start subscriber in background
	var subscribeErr error
	go func() {
		subscribeErr = subscriber.Subscribe(ctx)
	}()

	// Wait for subscription to be ready
	time.Sleep(100 * time.Millisecond)

	// Publish a test message
	payload := PriceStreamPayload{
		Symbol:       "BTCUSDT",
		Price:        50000.0,
		Change24hPct: 2.5,
		Volume24h:    1000000.0,
		UpdatedAt:    time.Now().Format(time.RFC3339),
	}
	data, err := json.Marshal(payload)
	require.NoError(t, err)

	err = redisClient.Publish(ctx, priceStreamChannel, data).Err()
	require.NoError(t, err)

	// Wait for message to be processed
	time.Sleep(200 * time.Millisecond)

	// Verify hub received the broadcast
	broadcasts := hub.getBroadcasts()
	require.Len(t, broadcasts, 1)

	assert.Equal(t, payload.Symbol, broadcasts[0].Symbol)
	assert.Equal(t, payload.Price, broadcasts[0].Price)
	assert.Equal(t, payload.Change24hPct, broadcasts[0].Change24hPct)
	assert.Equal(t, payload.Volume24h, broadcasts[0].Volume24h)
	assert.Equal(t, payload.UpdatedAt, broadcasts[0].UpdatedAt)

	cancel()
	// Subscriber should exit gracefully
	assert.Equal(t, context.Canceled, subscribeErr)
}

func TestPriceSubscriber_HandlesMultipleMessages(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	subscriber, redisClient, hub := newTestPriceSubscriber(t)
	defer redisClient.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Start subscriber
	go subscriber.Subscribe(ctx)
	time.Sleep(100 * time.Millisecond)

	// Publish multiple messages
	symbols := []string{"BTCUSDT", "ETHUSDT", "BNBUSDT"}
	for i, symbol := range symbols {
		payload := PriceStreamPayload{
			Symbol:       symbol,
			Price:        float64(1000 * (i + 1)),
			Change24hPct: float64(i),
			Volume24h:    float64(100000 * (i + 1)),
			UpdatedAt:    time.Now().Format(time.RFC3339),
		}
		data, _ := json.Marshal(payload)
		redisClient.Publish(ctx, priceStreamChannel, data)
	}

	// Wait for processing
	time.Sleep(300 * time.Millisecond)

	broadcasts := hub.getBroadcasts()
	assert.Len(t, broadcasts, len(symbols))

	// Verify all symbols were received
	receivedSymbols := make(map[string]bool)
	for _, b := range broadcasts {
		receivedSymbols[b.Symbol] = true
	}
	for _, symbol := range symbols {
		assert.True(t, receivedSymbols[symbol], "missing symbol: %s", symbol)
	}
}

func TestPriceSubscriber_IgnoresInvalidJSON(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	subscriber, redisClient, hub := newTestPriceSubscriber(t)
	defer redisClient.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Start subscriber
	go subscriber.Subscribe(ctx)
	time.Sleep(100 * time.Millisecond)

	// Publish invalid JSON
	redisClient.Publish(ctx, priceStreamChannel, "not valid json")

	// Publish valid message after invalid one
	validPayload := PriceStreamPayload{
		Symbol:       "BTCUSDT",
		Price:        50000.0,
		Change24hPct: 1.0,
		Volume24h:    100000.0,
		UpdatedAt:    time.Now().Format(time.RFC3339),
	}
	data, _ := json.Marshal(validPayload)
	redisClient.Publish(ctx, priceStreamChannel, data)

	time.Sleep(200 * time.Millisecond)

	broadcasts := hub.getBroadcasts()
	// Should have only received the valid message
	assert.Len(t, broadcasts, 1)
	assert.Equal(t, "BTCUSDT", broadcasts[0].Symbol)
}

func TestPriceSubscriber_CancelsGracefully(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	subscriber, redisClient, _ := newTestPriceSubscriber(t)
	defer redisClient.Close()

	ctx, cancel := context.WithCancel(context.Background())

	// Start subscriber
	errCh := make(chan error, 1)
	go func() {
		errCh <- subscriber.Subscribe(ctx)
	}()

	// Wait for subscription to be established
	time.Sleep(100 * time.Millisecond)

	// Cancel context
	cancel()

	// Subscriber should exit with context.Canceled
	select {
	case err := <-errCh:
		assert.Equal(t, context.Canceled, err)
	case <-time.After(2 * time.Second):
		t.Fatal("subscriber did not exit gracefully")
	}
}
