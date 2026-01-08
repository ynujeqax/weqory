package service

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/weqory/backend/pkg/crypto"
	"github.com/weqory/backend/pkg/errors"
)

// UserService handles user-related business logic
type UserService struct {
	pool *pgxpool.Pool
}

// NewUserService creates a new UserService
func NewUserService(pool *pgxpool.Pool) *UserService {
	return &UserService{pool: pool}
}

// User represents a user from the database
type User struct {
	ID                   int64
	TelegramID           int64
	Username             *string
	FirstName            string
	LastName             *string
	LanguageCode         string
	Plan                 string
	PlanExpiresAt        *time.Time
	PlanPeriod           *string
	NotificationsUsed    int
	NotificationsResetAt *time.Time
	NotificationsEnabled bool
	VibrationEnabled     bool
	CreatedAt            time.Time
	UpdatedAt            time.Time
	LastActiveAt         time.Time
}

// UserWithLimits includes user data with plan limits
type UserWithLimits struct {
	User
	MaxCoins             int
	MaxAlerts            int
	MaxNotifications     *int
	HistoryRetentionDays int
	CoinsUsed            int64
	AlertsUsed           int64
}

// GetByID retrieves a user by ID
func (s *UserService) GetByID(ctx context.Context, id int64) (*User, error) {
	query := `
		SELECT id, telegram_id, username, first_name, last_name, language_code,
		       plan, plan_expires_at, plan_period,
		       notifications_used, notifications_reset_at,
		       notifications_enabled, vibration_enabled,
		       created_at, updated_at, last_active_at
		FROM users WHERE id = $1
	`

	var user User
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&user.ID, &user.TelegramID, &user.Username, &user.FirstName, &user.LastName,
		&user.LanguageCode, &user.Plan, &user.PlanExpiresAt, &user.PlanPeriod,
		&user.NotificationsUsed, &user.NotificationsResetAt,
		&user.NotificationsEnabled, &user.VibrationEnabled,
		&user.CreatedAt, &user.UpdatedAt, &user.LastActiveAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.ErrUserNotFound
		}
		return nil, errors.Wrap(err, errors.ErrDatabase)
	}

	return &user, nil
}

// GetByTelegramID retrieves a user by Telegram ID
func (s *UserService) GetByTelegramID(ctx context.Context, telegramID int64) (*User, error) {
	query := `
		SELECT id, telegram_id, username, first_name, last_name, language_code,
		       plan, plan_expires_at, plan_period,
		       notifications_used, notifications_reset_at,
		       notifications_enabled, vibration_enabled,
		       created_at, updated_at, last_active_at
		FROM users WHERE telegram_id = $1
	`

	var user User
	err := s.pool.QueryRow(ctx, query, telegramID).Scan(
		&user.ID, &user.TelegramID, &user.Username, &user.FirstName, &user.LastName,
		&user.LanguageCode, &user.Plan, &user.PlanExpiresAt, &user.PlanPeriod,
		&user.NotificationsUsed, &user.NotificationsResetAt,
		&user.NotificationsEnabled, &user.VibrationEnabled,
		&user.CreatedAt, &user.UpdatedAt, &user.LastActiveAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.ErrUserNotFound
		}
		return nil, errors.Wrap(err, errors.ErrDatabase)
	}

	return &user, nil
}

// GetOrCreateByTelegramID gets existing user or creates a new one (atomic upsert)
func (s *UserService) GetOrCreateByTelegramID(ctx context.Context, tgUser *crypto.TelegramUser) (*UserWithLimits, error) {
	// Use INSERT ... ON CONFLICT for atomic upsert
	var userID int64
	err := s.pool.QueryRow(ctx, `
		INSERT INTO users (telegram_id, username, first_name, last_name, language_code)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (telegram_id) DO UPDATE SET
			username = COALESCE($2, users.username),
			first_name = COALESCE($3, users.first_name),
			last_name = COALESCE($4, users.last_name),
			language_code = COALESCE($5, users.language_code),
			last_active_at = NOW()
		RETURNING id
	`, tgUser.ID, nilIfEmpty(tgUser.Username), tgUser.FirstName, nilIfEmpty(tgUser.LastName), tgUser.LanguageCode).Scan(&userID)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrDatabase)
	}

	return s.GetWithLimits(ctx, userID)
}

// GetWithLimits retrieves user with plan limits and usage
func (s *UserService) GetWithLimits(ctx context.Context, userID int64) (*UserWithLimits, error) {
	query := `
		SELECT
			u.id, u.telegram_id, u.username, u.first_name, u.last_name, u.language_code,
			u.plan, u.plan_expires_at, u.plan_period,
			u.notifications_used, u.notifications_reset_at,
			u.notifications_enabled, u.vibration_enabled,
			u.created_at, u.updated_at, u.last_active_at,
			sp.max_coins, sp.max_alerts, sp.max_notifications, sp.history_retention_days,
			(SELECT COUNT(*) FROM watchlist WHERE user_id = u.id) as coins_used,
			(SELECT COUNT(*) FROM alerts WHERE user_id = u.id) as alerts_used
		FROM users u
		JOIN subscription_plans sp ON sp.name = u.plan
		WHERE u.id = $1
	`

	var user UserWithLimits
	err := s.pool.QueryRow(ctx, query, userID).Scan(
		&user.ID, &user.TelegramID, &user.Username, &user.FirstName, &user.LastName,
		&user.LanguageCode, &user.Plan, &user.PlanExpiresAt, &user.PlanPeriod,
		&user.NotificationsUsed, &user.NotificationsResetAt,
		&user.NotificationsEnabled, &user.VibrationEnabled,
		&user.CreatedAt, &user.UpdatedAt, &user.LastActiveAt,
		&user.MaxCoins, &user.MaxAlerts, &user.MaxNotifications, &user.HistoryRetentionDays,
		&user.CoinsUsed, &user.AlertsUsed,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.ErrUserNotFound
		}
		return nil, errors.Wrap(err, errors.ErrDatabase)
	}

	return &user, nil
}

// UpdateSettings updates user settings
func (s *UserService) UpdateSettings(ctx context.Context, userID int64, notificationsEnabled, vibrationEnabled *bool) (*User, error) {
	query := `
		UPDATE users SET
			notifications_enabled = COALESCE($2, notifications_enabled),
			vibration_enabled = COALESCE($3, vibration_enabled),
			updated_at = NOW()
		WHERE id = $1
		RETURNING id, telegram_id, username, first_name, last_name, language_code,
		          plan, plan_expires_at, plan_period,
		          notifications_used, notifications_reset_at,
		          notifications_enabled, vibration_enabled,
		          created_at, updated_at, last_active_at
	`

	var user User
	err := s.pool.QueryRow(ctx, query, userID, notificationsEnabled, vibrationEnabled).Scan(
		&user.ID, &user.TelegramID, &user.Username, &user.FirstName, &user.LastName,
		&user.LanguageCode, &user.Plan, &user.PlanExpiresAt, &user.PlanPeriod,
		&user.NotificationsUsed, &user.NotificationsResetAt,
		&user.NotificationsEnabled, &user.VibrationEnabled,
		&user.CreatedAt, &user.UpdatedAt, &user.LastActiveAt,
	)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrDatabase)
	}

	return &user, nil
}

// CheckAndDowngradeExpiredPlan checks if user's plan has expired and downgrades to standard
// Returns true if plan was downgraded, false otherwise
func (s *UserService) CheckAndDowngradeExpiredPlan(ctx context.Context, userID int64) (bool, error) {
	user, err := s.GetByID(ctx, userID)
	if err != nil {
		return false, err
	}

	// Check if plan is expired
	if user.PlanExpiresAt == nil || time.Now().Before(*user.PlanExpiresAt) {
		return false, nil // Not expired
	}

	// Plan is expired, downgrade to standard
	if err := s.DowngradePlan(ctx, userID); err != nil {
		return false, err
	}

	return true, nil
}

// DowngradePlan downgrades user to standard plan and enforces new limits
func (s *UserService) DowngradePlan(ctx context.Context, userID int64) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return errors.Wrap(err, errors.ErrDatabase)
	}
	defer tx.Rollback(ctx)

	// Lock user row to prevent concurrent modifications
	var currentPlan string
	err = tx.QueryRow(ctx, `
		SELECT plan FROM users WHERE id = $1 FOR UPDATE
	`, userID).Scan(&currentPlan)
	if err != nil {
		if err == pgx.ErrNoRows {
			return errors.ErrUserNotFound
		}
		return errors.Wrap(err, errors.ErrDatabase)
	}

	// Check if already on standard (idempotent)
	if currentPlan == "standard" {
		return nil // Already downgraded, nothing to do
	}

	// Get standard plan limits
	var maxCoins, maxAlerts int
	err = tx.QueryRow(ctx, `
		SELECT max_coins, max_alerts FROM subscription_plans WHERE name = 'standard'
	`).Scan(&maxCoins, &maxAlerts)
	if err != nil {
		return errors.Wrap(err, errors.ErrDatabase)
	}

	// Update user plan to standard
	_, err = tx.Exec(ctx, `
		UPDATE users SET
			plan = 'standard',
			plan_expires_at = NULL,
			plan_period = NULL,
			updated_at = NOW()
		WHERE id = $1
	`, userID)
	if err != nil {
		return errors.Wrap(err, errors.ErrDatabase)
	}

	// Pause excess alerts (keeping oldest ones active)
	_, err = tx.Exec(ctx, `
		WITH ranked AS (
			SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
			FROM alerts WHERE user_id = $1 AND is_paused = false
		)
		UPDATE alerts SET is_paused = true, updated_at = NOW()
		WHERE id IN (SELECT id FROM ranked WHERE rn > $2)
	`, userID, maxAlerts)
	if err != nil {
		return errors.Wrap(err, errors.ErrDatabase)
	}

	// Delete excess watchlist items (keeping oldest ones)
	// First, identify and delete alerts for coins being removed
	_, err = tx.Exec(ctx, `
		WITH excess_items AS (
			SELECT id, coin_id FROM (
				SELECT id, coin_id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
				FROM watchlist WHERE user_id = $1
			) ranked WHERE rn > $2
		)
		DELETE FROM alerts
		WHERE user_id = $1 AND coin_id IN (SELECT coin_id FROM excess_items)
	`, userID, maxCoins)
	if err != nil {
		return errors.Wrap(err, errors.ErrDatabase)
	}

	// Then delete excess watchlist items
	_, err = tx.Exec(ctx, `
		WITH ranked AS (
			SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
			FROM watchlist WHERE user_id = $1
		)
		DELETE FROM watchlist WHERE id IN (SELECT id FROM ranked WHERE rn > $2)
	`, userID, maxCoins)
	if err != nil {
		return errors.Wrap(err, errors.ErrDatabase)
	}

	return tx.Commit(ctx)
}

// GetExpiredPlanUsers returns users whose plans have expired
func (s *UserService) GetExpiredPlanUsers(ctx context.Context) ([]User, error) {
	query := `
		SELECT id, telegram_id, username, first_name, last_name, language_code,
		       plan, plan_expires_at, plan_period,
		       notifications_used, notifications_reset_at,
		       notifications_enabled, vibration_enabled,
		       created_at, updated_at, last_active_at
		FROM users
		WHERE plan != 'standard'
		  AND plan_expires_at IS NOT NULL
		  AND plan_expires_at < NOW()
	`

	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrDatabase)
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var user User
		err := rows.Scan(
			&user.ID, &user.TelegramID, &user.Username, &user.FirstName, &user.LastName,
			&user.LanguageCode, &user.Plan, &user.PlanExpiresAt, &user.PlanPeriod,
			&user.NotificationsUsed, &user.NotificationsResetAt,
			&user.NotificationsEnabled, &user.VibrationEnabled,
			&user.CreatedAt, &user.UpdatedAt, &user.LastActiveAt,
		)
		if err != nil {
			return nil, errors.Wrap(err, errors.ErrDatabase)
		}
		users = append(users, user)
	}

	return users, nil
}

// ResetMonthlyNotifications resets notification counts for all users at start of month
func (s *UserService) ResetMonthlyNotifications(ctx context.Context) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE users SET
			notifications_used = 0,
			notifications_reset_at = NOW()
		WHERE notifications_reset_at < DATE_TRUNC('month', NOW())
		   OR notifications_reset_at IS NULL
	`)
	if err != nil {
		return errors.Wrap(err, errors.ErrDatabase)
	}
	return nil
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
