package service

import (
	"context"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// CleanupService handles scheduled cleanup tasks
type CleanupService struct {
	pool        *pgxpool.Pool
	userService *UserService
	logger      *slog.Logger
	done        chan struct{}
}

// NewCleanupService creates a new CleanupService
func NewCleanupService(pool *pgxpool.Pool, userService *UserService, logger *slog.Logger) *CleanupService {
	return &CleanupService{
		pool:        pool,
		userService: userService,
		logger:      logger,
		done:        make(chan struct{}),
	}
}

// Start starts the background cleanup workers
func (s *CleanupService) Start(ctx context.Context) {
	// Run daily cleanup at startup and then every 24 hours
	go s.runDailyCleanup(ctx)

	// Run monthly reset at startup (will only actually reset if needed)
	go s.runMonthlyReset(ctx)
}

// Stop stops the cleanup service
func (s *CleanupService) Stop() {
	close(s.done)
}

// runDailyCleanup runs daily cleanup tasks
func (s *CleanupService) runDailyCleanup(ctx context.Context) {
	// Run immediately on startup
	s.performDailyCleanup(ctx)

	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-s.done:
			return
		case <-ticker.C:
			s.performDailyCleanup(ctx)
		}
	}
}

// performDailyCleanup performs all daily cleanup tasks
func (s *CleanupService) performDailyCleanup(ctx context.Context) {
	s.logger.Info("starting daily cleanup")

	// 1. Check for expired plans and downgrade
	expiredCount, err := s.processExpiredPlans(ctx)
	if err != nil {
		s.logger.Error("failed to process expired plans", slog.String("error", err.Error()))
	} else if expiredCount > 0 {
		s.logger.Info("downgraded expired plans", slog.Int("count", expiredCount))
	}

	// 2. Cleanup old history based on retention periods
	historyDeleted, err := s.cleanupHistory(ctx)
	if err != nil {
		s.logger.Error("failed to cleanup history", slog.String("error", err.Error()))
	} else if historyDeleted > 0 {
		s.logger.Info("cleaned up old history records", slog.Int64("deleted", historyDeleted))
	}

	s.logger.Info("daily cleanup completed")
}

// processExpiredPlans finds and downgrades all expired plans
func (s *CleanupService) processExpiredPlans(ctx context.Context) (int, error) {
	expiredUsers, err := s.userService.GetExpiredPlanUsers(ctx)
	if err != nil {
		return 0, err
	}

	count := 0
	for _, user := range expiredUsers {
		if err := s.userService.DowngradePlan(ctx, user.ID); err != nil {
			s.logger.Error("failed to downgrade user plan",
				slog.Int64("user_id", user.ID),
				slog.String("error", err.Error()),
			)
			continue
		}
		count++
		s.logger.Info("downgraded expired plan",
			slog.Int64("user_id", user.ID),
			slog.String("old_plan", user.Plan),
		)
	}

	return count, nil
}

// cleanupHistory removes old history records based on user retention periods
func (s *CleanupService) cleanupHistory(ctx context.Context) (int64, error) {
	result, err := s.pool.Exec(ctx, `
		WITH user_retention AS (
			SELECT u.id as user_id, sp.history_retention_days
			FROM users u
			JOIN subscription_plans sp ON sp.name = u.plan
		)
		DELETE FROM alert_history h
		USING user_retention ur
		WHERE h.user_id = ur.user_id
		  AND h.triggered_at < NOW() - (ur.history_retention_days || ' days')::INTERVAL
	`)
	if err != nil {
		return 0, err
	}

	return result.RowsAffected(), nil
}

// runMonthlyReset runs monthly reset tasks
func (s *CleanupService) runMonthlyReset(ctx context.Context) {
	// Run immediately on startup (will check if reset is needed)
	s.performMonthlyReset(ctx)

	// Check every hour if we need to reset (handles month boundaries)
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-s.done:
			return
		case <-ticker.C:
			s.performMonthlyReset(ctx)
		}
	}
}

// performMonthlyReset resets monthly notification counters
func (s *CleanupService) performMonthlyReset(ctx context.Context) {
	if err := s.userService.ResetMonthlyNotifications(ctx); err != nil {
		s.logger.Error("failed to reset monthly notifications", slog.String("error", err.Error()))
		return
	}
	s.logger.Debug("monthly notification reset check completed")
}

// CleanupHistoryForUser cleans up old history for a specific user
func (s *CleanupService) CleanupHistoryForUser(ctx context.Context, userID int64, retentionDays int) (int64, error) {
	result, err := s.pool.Exec(ctx, `
		DELETE FROM alert_history
		WHERE user_id = $1
		  AND triggered_at < NOW() - ($2 || ' days')::INTERVAL
	`, userID, retentionDays)
	if err != nil {
		return 0, err
	}

	return result.RowsAffected(), nil
}

// GetCleanupStats returns statistics about what would be cleaned up
type CleanupStats struct {
	ExpiredPlans        int
	HistoryToDelete     int64
	UsersNeedingReset   int
}

func (s *CleanupService) GetCleanupStats(ctx context.Context) (*CleanupStats, error) {
	stats := &CleanupStats{}

	// Count expired plans
	err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM users
		WHERE plan != 'standard'
		  AND plan_expires_at IS NOT NULL
		  AND plan_expires_at < NOW()
	`).Scan(&stats.ExpiredPlans)
	if err != nil {
		return nil, err
	}

	// Count history records to delete
	err = s.pool.QueryRow(ctx, `
		WITH user_retention AS (
			SELECT u.id as user_id, sp.history_retention_days
			FROM users u
			JOIN subscription_plans sp ON sp.name = u.plan
		)
		SELECT COUNT(*) FROM alert_history h
		JOIN user_retention ur ON h.user_id = ur.user_id
		WHERE h.triggered_at < NOW() - (ur.history_retention_days || ' days')::INTERVAL
	`).Scan(&stats.HistoryToDelete)
	if err != nil {
		return nil, err
	}

	// Count users needing notification reset
	err = s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM users
		WHERE notifications_reset_at < DATE_TRUNC('month', NOW())
		   OR notifications_reset_at IS NULL
	`).Scan(&stats.UsersNeedingReset)
	if err != nil {
		return nil, err
	}

	return stats, nil
}
