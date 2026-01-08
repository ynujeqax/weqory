package notification

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/weqory/backend/internal/telegram"
)

const (
	// Rate limiting
	userRateLimitWindow  = 1 * time.Minute
	userMaxNotifications = 10 // per minute per user

	// Global rate limiting for Telegram API
	globalRateLimitWindow  = 1 * time.Second
	globalMaxNotifications = 30 // per second

	// Retry settings
	maxRetries       = 3
	retryBaseDelay   = 1 * time.Second

	// Redis keys
	userRateLimitKey   = "notification:rate:user:"
	globalRateLimitKey = "notification:rate:global"
)

// Service handles sending notifications to users
type Service struct {
	pool         *pgxpool.Pool
	redis        *redis.Client
	telegram     *telegram.Client
	miniAppURL   string
	logger       *slog.Logger

	// Metrics
	sentCount    int64
	failedCount  int64
	rateLimited  int64
	mu           sync.RWMutex

	done chan struct{}
}

// NewService creates a new notification service
func NewService(
	pool *pgxpool.Pool,
	redisClient *redis.Client,
	telegramClient *telegram.Client,
	miniAppURL string,
	logger *slog.Logger,
) *Service {
	return &Service{
		pool:       pool,
		redis:      redisClient,
		telegram:   telegramClient,
		miniAppURL: miniAppURL,
		logger:     logger,
		done:       make(chan struct{}),
	}
}

// SendNotification sends a notification to a user with rate limiting
func (s *Service) SendNotification(ctx context.Context, notification telegram.AlertNotification) error {
	// Check monthly notification limit based on plan
	monthlyAllowed, err := s.checkMonthlyNotificationLimit(ctx, notification.UserID)
	if err != nil {
		s.logger.Error("monthly limit check failed",
			slog.Int64("user_id", notification.UserID),
			slog.String("error", err.Error()),
		)
		// Continue anyway - better to send than to fail silently
	} else if !monthlyAllowed {
		s.mu.Lock()
		s.rateLimited++
		s.mu.Unlock()

		return fmt.Errorf("monthly notification limit reached")
	}

	// Check user rate limit (per minute)
	allowed, err := s.checkUserRateLimit(ctx, notification.UserID)
	if err != nil {
		s.logger.Error("rate limit check failed",
			slog.Int64("user_id", notification.UserID),
			slog.String("error", err.Error()),
		)
		// Continue anyway - better to send than to fail silently
	} else if !allowed {
		s.mu.Lock()
		s.rateLimited++
		s.mu.Unlock()

		s.logger.Warn("user rate limited",
			slog.Int64("user_id", notification.UserID),
		)
		return fmt.Errorf("user rate limited")
	}

	// Check global rate limit
	globalAllowed, err := s.checkGlobalRateLimit(ctx)
	if err != nil {
		s.logger.Error("global rate limit check failed", slog.String("error", err.Error()))
	} else if !globalAllowed {
		// Wait and retry
		time.Sleep(100 * time.Millisecond)
	}

	// Send notification with retry
	var lastErr error
	for attempt := 0; attempt < maxRetries; attempt++ {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-s.done:
			return fmt.Errorf("service stopped")
		default:
		}

		result, err := s.telegram.SendAlertNotification(ctx, notification, s.miniAppURL)
		if err == nil && result.Success {
			// Record success
			s.mu.Lock()
			s.sentCount++
			s.mu.Unlock()

			// Update history record as notified
			if err := s.markHistoryNotified(ctx, notification); err != nil {
				s.logger.Error("failed to mark history notified",
					slog.Int64("user_id", notification.UserID),
					slog.String("error", err.Error()),
				)
			}

			// Increment user notification count
			if err := s.incrementUserNotificationCount(ctx, notification.UserID); err != nil {
				s.logger.Error("failed to increment notification count",
					slog.Int64("user_id", notification.UserID),
					slog.String("error", err.Error()),
				)
			}

			return nil
		}

		lastErr = err

		// Check if rate limited by Telegram
		if result != nil && result.RetryAfter > 0 {
			s.logger.Warn("telegram rate limited",
				slog.Int("retry_after", result.RetryAfter),
			)
			time.Sleep(time.Duration(result.RetryAfter) * time.Second)
			continue
		}

		// Exponential backoff
		delay := retryBaseDelay * time.Duration(1<<attempt)
		s.logger.Warn("notification failed, retrying",
			slog.Int64("user_id", notification.UserID),
			slog.Int("attempt", attempt+1),
			slog.Duration("delay", delay),
			slog.String("error", err.Error()),
		)
		time.Sleep(delay)
	}

	// Record failure
	s.mu.Lock()
	s.failedCount++
	s.mu.Unlock()

	return fmt.Errorf("failed after %d retries: %w", maxRetries, lastErr)
}

// checkUserRateLimit checks if user is within rate limit
func (s *Service) checkUserRateLimit(ctx context.Context, userID int64) (bool, error) {
	key := fmt.Sprintf("%s%d", userRateLimitKey, userID)
	now := time.Now().UnixMilli()
	windowStart := now - userRateLimitWindow.Milliseconds()

	pipe := s.redis.Pipeline()

	// Remove old entries
	pipe.ZRemRangeByScore(ctx, key, "0", fmt.Sprintf("%d", windowStart))

	// Count current entries
	countCmd := pipe.ZCard(ctx, key)

	// Set expiry with extended TTL to prevent premature deletion
	pipe.Expire(ctx, key, 2*userRateLimitWindow)

	_, err := pipe.Exec(ctx)
	if err != nil {
		return false, err
	}

	count := countCmd.Val()
	if count >= userMaxNotifications {
		return false, nil
	}

	// Add current request with unique member to handle concurrent requests
	// Use nanosecond precision to ensure uniqueness
	member := fmt.Sprintf("%d:%d", now, time.Now().UnixNano())
	if err := s.redis.ZAdd(ctx, key, redis.Z{
		Score:  float64(now),
		Member: member,
	}).Err(); err != nil {
		return false, fmt.Errorf("failed to add to user rate limit: %w", err)
	}

	return true, nil
}

// checkGlobalRateLimit checks global Telegram API rate limit
func (s *Service) checkGlobalRateLimit(ctx context.Context) (bool, error) {
	key := globalRateLimitKey
	now := time.Now().UnixMilli()
	windowStart := now - globalRateLimitWindow.Milliseconds()

	pipe := s.redis.Pipeline()
	pipe.ZRemRangeByScore(ctx, key, "0", fmt.Sprintf("%d", windowStart))
	countCmd := pipe.ZCard(ctx, key)
	pipe.Expire(ctx, key, 2*globalRateLimitWindow) // Extended TTL to prevent premature expiry

	_, err := pipe.Exec(ctx)
	if err != nil {
		return false, err
	}

	count := countCmd.Val()
	if count >= globalMaxNotifications {
		return false, nil
	}

	// Add current request with error check to prevent race condition
	if err := s.redis.ZAdd(ctx, key, redis.Z{
		Score:  float64(now),
		Member: fmt.Sprintf("%d", now),
	}).Err(); err != nil {
		return false, fmt.Errorf("failed to add to global rate limit: %w", err)
	}

	return true, nil
}

// markHistoryNotified marks an alert history record as notified
func (s *Service) markHistoryNotified(ctx context.Context, notification telegram.AlertNotification) error {
	query := `
		UPDATE alert_history
		SET notification_sent = true
		WHERE user_id = $1
		  AND coin_id = (SELECT id FROM coins WHERE symbol = $2 LIMIT 1)
		  AND triggered_at >= $3 - INTERVAL '1 minute'
		  AND notification_sent = false
		ORDER BY triggered_at DESC
		LIMIT 1
	`
	_, err := s.pool.Exec(ctx, query, notification.UserID, notification.CoinSymbol, notification.TriggeredAt)
	return err
}

// incrementUserNotificationCount increments user's notification usage
func (s *Service) incrementUserNotificationCount(ctx context.Context, userID int64) error {
	query := `UPDATE users SET notifications_used = notifications_used + 1, updated_at = NOW() WHERE id = $1`
	_, err := s.pool.Exec(ctx, query, userID)
	return err
}

// GetUserNotificationLimit checks if user can receive notifications based on plan limits
func (s *Service) GetUserNotificationLimit(ctx context.Context, userID int64) (bool, int, *int, error) {
	query := `
		SELECT u.notifications_used, sp.max_notifications, u.notifications_enabled
		FROM users u
		JOIN subscription_plans sp ON sp.name = u.plan
		WHERE u.id = $1
	`

	var used int
	var maxNotifications *int
	var enabled bool
	err := s.pool.QueryRow(ctx, query, userID).Scan(&used, &maxNotifications, &enabled)
	if err != nil {
		return false, 0, nil, err
	}

	// Can send if enabled AND (unlimited OR under limit)
	canSend := enabled && (maxNotifications == nil || used < *maxNotifications)
	return canSend, used, maxNotifications, nil
}

// checkMonthlyNotificationLimit checks if user is under their monthly notification limit
func (s *Service) checkMonthlyNotificationLimit(ctx context.Context, userID int64) (bool, error) {
	canSend, used, max, err := s.GetUserNotificationLimit(ctx, userID)
	if err != nil {
		s.logger.Error("failed to get notification limit",
			slog.Int64("user_id", userID),
			slog.String("error", err.Error()),
		)
		// Continue anyway - better to potentially over-notify than miss important alerts
		return true, err
	}

	if !canSend {
		if max != nil {
			s.logger.Warn("user monthly notification limit reached",
				slog.Int64("user_id", userID),
				slog.Int("used", used),
				slog.Int("max", *max),
			)
		}
		return false, nil
	}

	return true, nil
}

// GetStats returns notification statistics
func (s *Service) GetStats() (sent, failed, rateLimited int64) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.sentCount, s.failedCount, s.rateLimited
}

// Stop stops the notification service
func (s *Service) Stop() {
	close(s.done)
}
