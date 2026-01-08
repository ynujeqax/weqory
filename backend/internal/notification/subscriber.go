package notification

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/weqory/backend/internal/telegram"
)

const (
	// Redis channel for alert notifications
	alertNotificationChannel = "alert:notifications"

	// Worker pool size
	workerCount = 5

	// Buffer size for notification queue
	queueBufferSize = 100

	// Maximum size of processedIDs map to prevent unbounded growth
	maxProcessedIDsSize = 10000
)

// NotificationPayload represents the notification message from alert engine
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

// Subscriber listens for notification events from Redis
type Subscriber struct {
	pool          *pgxpool.Pool
	redis         *redis.Client
	service       *Service
	logger        *slog.Logger
	queue         chan NotificationPayload
	processedIDs  map[string]time.Time // For deduplication
	processedMu   sync.RWMutex
	wg            sync.WaitGroup
	done          chan struct{}
}

// NewSubscriber creates a new notification subscriber
func NewSubscriber(
	pool *pgxpool.Pool,
	redisClient *redis.Client,
	service *Service,
	logger *slog.Logger,
) *Subscriber {
	return &Subscriber{
		pool:         pool,
		redis:        redisClient,
		service:      service,
		logger:       logger,
		queue:        make(chan NotificationPayload, queueBufferSize),
		processedIDs: make(map[string]time.Time),
		done:         make(chan struct{}),
	}
}

// Run starts the subscriber
func (s *Subscriber) Run(ctx context.Context) error {
	s.logger.Info("starting notification subscriber")

	// Start worker pool
	for i := 0; i < workerCount; i++ {
		s.wg.Add(1)
		go s.worker(ctx, i)
	}

	// Start cleanup goroutine for processed IDs
	s.wg.Add(1)
	go s.cleanupLoop(ctx)

	// Subscribe to Redis channel
	pubsub := s.redis.Subscribe(ctx, alertNotificationChannel)
	defer pubsub.Close()

	s.logger.Info("subscribed to alert notifications channel")

	// Receive messages
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-s.done:
			return nil
		default:
		}

		msg, err := pubsub.ReceiveMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return ctx.Err()
			}
			s.logger.Error("failed to receive message", slog.String("error", err.Error()))
			time.Sleep(time.Second)
			continue
		}

		var payload NotificationPayload
		if err := json.Unmarshal([]byte(msg.Payload), &payload); err != nil {
			s.logger.Error("failed to unmarshal notification",
				slog.String("error", err.Error()),
			)
			continue
		}

		// Check for duplicate with atomic mark to prevent race condition
		if !s.tryMarkProcessed(payload.EventID) {
			s.logger.Debug("skipping duplicate notification",
				slog.String("event_id", payload.EventID),
			)
			continue
		}

		// Queue for processing
		select {
		case s.queue <- payload:
		default:
			s.logger.Warn("notification queue full, dropping message",
				slog.String("event_id", payload.EventID),
			)
			// Remove from processed since we're not processing it
			s.removeProcessed(payload.EventID)
		}
	}
}

// worker processes notifications from the queue
func (s *Subscriber) worker(ctx context.Context, id int) {
	defer s.wg.Done()

	s.logger.Debug("notification worker started", slog.Int("worker_id", id))

	for {
		select {
		case <-ctx.Done():
			s.logger.Debug("worker stopped: context cancelled", slog.Int("worker_id", id))
			return
		case <-s.done:
			// Don't return immediately - drain the queue first
			s.logger.Debug("worker draining queue", slog.Int("worker_id", id))
			s.drainQueue(ctx)
			return
		case payload, ok := <-s.queue:
			if !ok {
				// Queue closed, exit gracefully
				s.logger.Debug("worker stopped: queue closed", slog.Int("worker_id", id))
				return
			}
			s.processNotification(ctx, payload)
		}
	}
}

// drainQueue processes remaining items in the queue during shutdown
func (s *Subscriber) drainQueue(ctx context.Context) {
	for {
		select {
		case payload, ok := <-s.queue:
			if !ok {
				return
			}
			s.processNotification(ctx, payload)
		case <-time.After(100 * time.Millisecond):
			// No more items, exit
			return
		}
	}
}

// processNotification handles a single notification
func (s *Subscriber) processNotification(ctx context.Context, payload NotificationPayload) {
	// Fetch user details
	user, err := s.getUserDetails(ctx, payload.UserID)
	if err != nil {
		s.logger.Error("failed to fetch user details",
			slog.Int64("user_id", payload.UserID),
			slog.String("error", err.Error()),
		)
		return
	}

	// Check if user can receive notifications
	if !user.NotificationsEnabled {
		s.logger.Debug("user notifications disabled",
			slog.Int64("user_id", payload.UserID),
		)
		return
	}

	// Check notification limit
	canSend, used, max, err := s.service.GetUserNotificationLimit(ctx, payload.UserID)
	if err != nil {
		s.logger.Error("failed to check notification limit",
			slog.Int64("user_id", payload.UserID),
			slog.String("error", err.Error()),
		)
		// Continue anyway
	} else if !canSend {
		maxVal := -1
		if max != nil {
			maxVal = *max
		}
		s.logger.Warn("user notification limit reached",
			slog.Int64("user_id", payload.UserID),
			slog.Int("used", used),
			slog.Int("max", maxVal),
		)
		return
	}

	// Fetch coin details
	coin, err := s.getCoinDetails(ctx, payload.CoinSymbol)
	if err != nil {
		s.logger.Error("failed to fetch coin details",
			slog.String("symbol", payload.CoinSymbol),
			slog.String("error", err.Error()),
		)
	}

	// Build notification
	notification := telegram.AlertNotification{
		UserID:         payload.UserID,
		TelegramID:     user.TelegramID,
		CoinSymbol:     payload.CoinSymbol,
		CoinName:       coin.Name,
		AlertType:      payload.AlertType,
		ConditionValue: payload.ConditionValue,
		TriggeredPrice: payload.TriggeredPrice,
		TriggeredAt:    payload.TriggeredAt,
	}

	// Calculate price change if available
	if coin.CurrentPrice > 0 && coin.PriceChange24h != nil {
		notification.PriceChange = *coin.PriceChange24h
	}

	// Send notification
	if err := s.service.SendNotification(ctx, notification); err != nil {
		s.logger.Error("failed to send notification",
			slog.Int64("user_id", payload.UserID),
			slog.String("error", err.Error()),
		)
	}

	// Note: Already marked as processed when event was received
}

// UserDetails holds user information needed for notifications
type UserDetails struct {
	ID                   int64
	TelegramID           int64
	NotificationsEnabled bool
}

// CoinDetails holds coin information
type CoinDetails struct {
	Symbol         string
	Name           string
	CurrentPrice   float64
	PriceChange24h *float64
}

// getUserDetails fetches user details from database
func (s *Subscriber) getUserDetails(ctx context.Context, userID int64) (*UserDetails, error) {
	query := `
		SELECT id, telegram_id, notifications_enabled
		FROM users WHERE id = $1
	`
	var user UserDetails
	err := s.pool.QueryRow(ctx, query, userID).Scan(
		&user.ID, &user.TelegramID, &user.NotificationsEnabled,
	)
	return &user, err
}

// getCoinDetails fetches coin details from database
func (s *Subscriber) getCoinDetails(ctx context.Context, symbol string) (*CoinDetails, error) {
	query := `
		SELECT symbol, name, COALESCE(current_price, 0), price_change_24h
		FROM coins WHERE symbol = $1
	`
	var coin CoinDetails
	err := s.pool.QueryRow(ctx, query, symbol).Scan(
		&coin.Symbol, &coin.Name, &coin.CurrentPrice, &coin.PriceChange24h,
	)
	if err != nil {
		// Return minimal coin info on error
		return &CoinDetails{Symbol: symbol, Name: symbol}, nil
	}
	return &coin, nil
}

// tryMarkProcessed atomically checks and marks an event as processed
// Returns true if this is the first time seeing this event, false if duplicate
func (s *Subscriber) tryMarkProcessed(eventID string) bool {
	s.processedMu.Lock()
	defer s.processedMu.Unlock()

	// Check if already processed
	if _, exists := s.processedIDs[eventID]; exists {
		return false
	}

	// Enforce max size to prevent unbounded growth
	if len(s.processedIDs) >= maxProcessedIDsSize {
		// Emergency cleanup - remove oldest entries
		s.logger.Warn("processedIDs map at max capacity, forcing cleanup",
			slog.Int("size", len(s.processedIDs)),
		)

		cutoff := time.Now().Add(-10 * time.Minute)
		for id, processedAt := range s.processedIDs {
			if processedAt.Before(cutoff) {
				delete(s.processedIDs, id)
			}
		}

		// If still too large after cleanup, reject to prevent OOM
		if len(s.processedIDs) >= maxProcessedIDsSize {
			s.logger.Error("processedIDs map still at max capacity after cleanup",
				slog.Int("size", len(s.processedIDs)),
			)
			// Still mark as processed to prevent infinite growth
			s.processedIDs[eventID] = time.Now()
			return true
		}
	}

	// Mark as processed
	s.processedIDs[eventID] = time.Now()
	return true
}

// removeProcessed removes an event from processed map
func (s *Subscriber) removeProcessed(eventID string) {
	s.processedMu.Lock()
	delete(s.processedIDs, eventID)
	s.processedMu.Unlock()
}

// cleanupLoop removes old processed IDs
func (s *Subscriber) cleanupLoop(ctx context.Context) {
	defer s.wg.Done()

	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-s.done:
			return
		case <-ticker.C:
			s.cleanupProcessedIDs()
		}
	}
}

// cleanupProcessedIDs removes processed IDs older than 1 hour
func (s *Subscriber) cleanupProcessedIDs() {
	cutoff := time.Now().Add(-1 * time.Hour)

	s.processedMu.Lock()
	defer s.processedMu.Unlock()

	for id, processedAt := range s.processedIDs {
		if processedAt.Before(cutoff) {
			delete(s.processedIDs, id)
		}
	}

	s.logger.Debug("cleaned up processed IDs", slog.Int("remaining", len(s.processedIDs)))
}

// Stop stops the subscriber gracefully, draining the queue
func (s *Subscriber) Stop() {
	s.logger.Info("stopping notification subscriber")

	// Close done channel to stop receiving new messages
	close(s.done)

	// Drain the queue before stopping workers
	queueLen := len(s.queue)
	if queueLen > 0 {
		s.logger.Info("draining notification queue",
			slog.Int("pending_notifications", queueLen),
		)
	}

	// Close the queue after giving workers time to drain it
	// Workers will exit when queue is closed
	time.Sleep(100 * time.Millisecond) // Allow last messages to be queued
	close(s.queue)

	// Wait for workers to finish processing with timeout
	done := make(chan struct{})
	go func() {
		s.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		s.logger.Info("all workers stopped gracefully")
	case <-time.After(30 * time.Second):
		s.logger.Warn("timeout waiting for workers to stop",
			slog.Int("remaining_queue", len(s.queue)),
		)
	}
}

// GetQueueLength returns the current queue length
func (s *Subscriber) GetQueueLength() int {
	return len(s.queue)
}
