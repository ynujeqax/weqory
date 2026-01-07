package alert

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
	"github.com/weqory/backend/internal/binance"
)

func newTestPricePublisher(t *testing.T) (*PricePublisher, *redis.Client) {
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})

	// Test connection
	ctx := context.Background()
	if err := redisClient.Ping(ctx).Err(); err != nil {
		t.Skip("Redis not available, skipping integration test")
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	publisher := NewPricePublisher(redisClient, logger)

	return publisher, redisClient
}

func TestPricePublisher_Publish(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	publisher, redisClient := newTestPricePublisher(t)
	defer redisClient.Close()

	ctx := context.Background()

	// Subscribe to channel
	pubsub := redisClient.Subscribe(ctx, priceStreamChannel)
	defer pubsub.Close()

	// Wait for subscription confirmation
	_, err := pubsub.Receive(ctx)
	require.NoError(t, err)

	// Publish price update
	testData := binance.PriceData{
		Symbol:        "BTCUSDT",
		Price:         50000.0,
		ChangePercent: 2.5,
		Volume24h:     1000000.0,
		UpdatedAt:     time.Now(),
	}

	publisher.Publish(ctx, testData)

	// Receive message with timeout
	ch := pubsub.Channel()
	select {
	case msg := <-ch:
		var payload PriceStreamPayload
		err := json.Unmarshal([]byte(msg.Payload), &payload)
		require.NoError(t, err)

		assert.Equal(t, testData.Symbol, payload.Symbol)
		assert.Equal(t, testData.Price, payload.Price)
		assert.Equal(t, testData.ChangePercent, payload.Change24hPct)
		assert.Equal(t, testData.Volume24h, payload.Volume24h)
		assert.NotEmpty(t, payload.UpdatedAt)

	case <-time.After(2 * time.Second):
		t.Fatal("timeout waiting for price update message")
	}
}

func TestPricePublisher_Throttling(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	publisher, redisClient := newTestPricePublisher(t)
	defer redisClient.Close()

	ctx := context.Background()

	// Subscribe to channel
	pubsub := redisClient.Subscribe(ctx, priceStreamChannel)
	defer pubsub.Close()

	_, err := pubsub.Receive(ctx)
	require.NoError(t, err)

	ch := pubsub.Channel()

	// Publish multiple updates rapidly for the same symbol
	testData := binance.PriceData{
		Symbol:        "ETHUSDT",
		Price:         3000.0,
		ChangePercent: 1.5,
		Volume24h:     500000.0,
		UpdatedAt:     time.Now(),
	}

	// Publish 10 times rapidly
	for i := 0; i < 10; i++ {
		testData.Price = 3000.0 + float64(i)
		publisher.Publish(ctx, testData)
	}

	// Count received messages
	receivedCount := 0
	timeout := time.After(1 * time.Second)

	for {
		select {
		case <-ch:
			receivedCount++
		case <-timeout:
			goto done
		}
	}
done:

	// Due to throttling, we should receive far fewer messages than sent
	assert.LessOrEqual(t, receivedCount, 3,
		"throttling not working - received too many messages")
	assert.GreaterOrEqual(t, receivedCount, 1,
		"should have received at least one message")
}

func TestPricePublisher_ConcurrentPublish(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	publisher, redisClient := newTestPricePublisher(t)
	defer redisClient.Close()

	ctx := context.Background()

	// Subscribe to channel
	pubsub := redisClient.Subscribe(ctx, priceStreamChannel)
	defer pubsub.Close()

	_, err := pubsub.Receive(ctx)
	require.NoError(t, err)

	// Publish concurrently from multiple goroutines with different symbols
	symbols := []string{"BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "ADAUSDT"}
	var wg sync.WaitGroup

	for _, symbol := range symbols {
		wg.Add(1)
		go func(s string) {
			defer wg.Done()
			data := binance.PriceData{
				Symbol:        s,
				Price:         100.0,
				ChangePercent: 1.0,
				Volume24h:     10000.0,
				UpdatedAt:     time.Now(),
			}
			publisher.Publish(ctx, data)
		}(symbol)
	}

	wg.Wait()

	// Collect messages
	ch := pubsub.Channel()
	received := make(map[string]bool)
	timeout := time.After(2 * time.Second)

	for {
		select {
		case msg := <-ch:
			var payload PriceStreamPayload
			if err := json.Unmarshal([]byte(msg.Payload), &payload); err == nil {
				received[payload.Symbol] = true
			}
			if len(received) == len(symbols) {
				goto done
			}
		case <-timeout:
			goto done
		}
	}
done:

	// Each symbol should have been published (no race conditions)
	assert.Equal(t, len(symbols), len(received),
		"not all symbols were published correctly")
}

func TestPricePublisher_PayloadFormat(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	publisher, redisClient := newTestPricePublisher(t)
	defer redisClient.Close()

	ctx := context.Background()

	// Subscribe to channel
	pubsub := redisClient.Subscribe(ctx, priceStreamChannel)
	defer pubsub.Close()

	_, err := pubsub.Receive(ctx)
	require.NoError(t, err)

	// Use a unique symbol to avoid throttle from previous tests
	testData := binance.PriceData{
		Symbol:        "XRPUSDT",
		Price:         0.5,
		ChangePercent: -1.5,
		Volume24h:     999999.99,
		UpdatedAt:     time.Date(2025, 1, 7, 12, 0, 0, 0, time.UTC),
	}

	publisher.Publish(ctx, testData)

	ch := pubsub.Channel()
	select {
	case msg := <-ch:
		// Verify JSON structure matches frontend expectations
		var raw map[string]interface{}
		err := json.Unmarshal([]byte(msg.Payload), &raw)
		require.NoError(t, err)

		// Check field names are camelCase as expected by frontend
		assert.Contains(t, raw, "symbol")
		assert.Contains(t, raw, "price")
		assert.Contains(t, raw, "change24hPct")
		assert.Contains(t, raw, "volume24h")
		assert.Contains(t, raw, "updatedAt")

		// Check updatedAt is ISO 8601 format
		updatedAt, ok := raw["updatedAt"].(string)
		assert.True(t, ok)
		_, parseErr := time.Parse(time.RFC3339, updatedAt)
		assert.NoError(t, parseErr, "updatedAt should be in RFC3339 format")

	case <-time.After(2 * time.Second):
		t.Fatal("timeout waiting for message")
	}
}
