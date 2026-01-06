package alert

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	// Redis channel for alert notifications
	alertNotificationChannel = "alert:notifications"

	// Redis queue for failed notifications (retry queue)
	alertRetryQueue = "alert:retry_queue"

	// TTL for notification messages
	notificationTTL = 24 * time.Hour
)

// NotificationPayload represents the notification message sent to notification service
type NotificationPayload struct {
	EventID        string    `json:"event_id"`
	AlertID        int64     `json:"alert_id"`
	UserID         int64     `json:"user_id"`
	CoinSymbol     string    `json:"coin_symbol"`
	AlertType      string    `json:"alert_type"`
	ConditionValue float64   `json:"condition_value"`
	TriggeredPrice float64   `json:"triggered_price"`
	TriggeredAt    time.Time `json:"triggered_at"`
	CreatedAt      time.Time `json:"created_at"`
}

// Publisher publishes alert events to Redis for notification service
type Publisher struct {
	client *redis.Client
	logger *slog.Logger
}

// NewPublisher creates a new notification publisher
func NewPublisher(client *redis.Client, logger *slog.Logger) *Publisher {
	return &Publisher{
		client: client,
		logger: logger,
	}
}

// Publish publishes a trigger event to Redis
func (p *Publisher) Publish(ctx context.Context, event *TriggerEvent) error {
	payload := NotificationPayload{
		EventID:        generateEventID(event),
		AlertID:        event.AlertID,
		UserID:         event.UserID,
		CoinSymbol:     event.CoinSymbol,
		AlertType:      string(event.AlertType),
		ConditionValue: event.ConditionValue,
		TriggeredPrice: event.TriggeredPrice,
		TriggeredAt:    event.TriggeredAt,
		CreatedAt:      time.Now(),
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal notification payload: %w", err)
	}

	// Publish to Redis pub/sub channel
	if err := p.client.Publish(ctx, alertNotificationChannel, data).Err(); err != nil {
		// If publish fails, add to retry queue
		p.logger.Error("failed to publish notification, adding to retry queue",
			slog.Int64("alert_id", event.AlertID),
			slog.String("error", err.Error()),
		)
		if retryErr := p.addToRetryQueue(ctx, data); retryErr != nil {
			p.logger.Error("CRITICAL: failed to add to retry queue - notification lost",
				slog.Int64("alert_id", event.AlertID),
				slog.String("publish_error", err.Error()),
				slog.String("retry_error", retryErr.Error()),
			)
			return fmt.Errorf("failed to publish and queue notification: publish=%w, retry=%v", err, retryErr)
		}
		return err
	}

	p.logger.Debug("published notification",
		slog.Int64("alert_id", event.AlertID),
		slog.Int64("user_id", event.UserID),
		slog.String("symbol", event.CoinSymbol),
	)

	return nil
}

// addToRetryQueue adds a failed notification to the retry queue
func (p *Publisher) addToRetryQueue(ctx context.Context, data []byte) error {
	return p.client.RPush(ctx, alertRetryQueue, data).Err()
}

// ProcessRetryQueue processes failed notifications in the retry queue
func (p *Publisher) ProcessRetryQueue(ctx context.Context) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		// Pop from retry queue
		data, err := p.client.LPop(ctx, alertRetryQueue).Bytes()
		if err != nil {
			if err == redis.Nil {
				// Queue is empty
				return nil
			}
			return fmt.Errorf("failed to pop from retry queue: %w", err)
		}

		// Try to publish again
		if err := p.client.Publish(ctx, alertNotificationChannel, data).Err(); err != nil {
			// Put back at the end of queue with error handling
			if rpushErr := p.client.RPush(ctx, alertRetryQueue, data).Err(); rpushErr != nil {
				p.logger.Error("CRITICAL: failed to re-queue notification after retry failure",
					slog.String("publish_error", err.Error()),
					slog.String("rpush_error", rpushErr.Error()),
				)
				// Don't continue the loop - return error to prevent infinite loop
				return fmt.Errorf("failed to re-queue notification: %w", rpushErr)
			}
			p.logger.Error("retry publish failed, re-queued",
				slog.String("error", err.Error()),
			)
			time.Sleep(time.Second)
			continue
		}

		p.logger.Debug("retried notification published successfully")
	}
}

// GetRetryQueueLength returns the number of items in the retry queue
func (p *Publisher) GetRetryQueueLength(ctx context.Context) (int64, error) {
	return p.client.LLen(ctx, alertRetryQueue).Result()
}

// CreateTriggerHandler creates a handler function that publishes events
func (p *Publisher) CreateTriggerHandler() TriggerHandler {
	return func(event *TriggerEvent) {
		ctx := context.Background()
		if err := p.Publish(ctx, event); err != nil {
			p.logger.Error("failed to publish trigger event",
				slog.Int64("alert_id", event.AlertID),
				slog.String("error", err.Error()),
			)
		}
	}
}

// generateEventID creates a unique event ID
func generateEventID(event *TriggerEvent) string {
	return fmt.Sprintf("%d_%d_%d", event.AlertID, event.UserID, event.TriggeredAt.UnixNano())
}

// Subscriber subscribes to alert notifications
type Subscriber struct {
	client  *redis.Client
	logger  *slog.Logger
	handler func(payload NotificationPayload)
}

// NewSubscriber creates a new notification subscriber
func NewSubscriber(client *redis.Client, logger *slog.Logger) *Subscriber {
	return &Subscriber{
		client: client,
		logger: logger,
	}
}

// SetHandler sets the notification handler
func (s *Subscriber) SetHandler(handler func(payload NotificationPayload)) {
	s.handler = handler
}

// Subscribe starts listening for notifications
func (s *Subscriber) Subscribe(ctx context.Context) error {
	pubsub := s.client.Subscribe(ctx, alertNotificationChannel)
	defer pubsub.Close()

	s.logger.Info("subscribed to alert notifications")

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		msg, err := pubsub.ReceiveMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return ctx.Err()
			}
			s.logger.Error("failed to receive message", slog.String("error", err.Error()))
			continue
		}

		var payload NotificationPayload
		if err := json.Unmarshal([]byte(msg.Payload), &payload); err != nil {
			s.logger.Error("failed to unmarshal notification",
				slog.String("error", err.Error()),
			)
			continue
		}

		if s.handler != nil {
			s.handler(payload)
		}
	}
}
