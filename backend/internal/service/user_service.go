package service

import (
	"context"

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
	PlanExpiresAt        *string
	PlanPeriod           *string
	NotificationsUsed    int
	NotificationsResetAt *string
	NotificationsEnabled bool
	VibrationEnabled     bool
	CreatedAt            string
	UpdatedAt            string
	LastActiveAt         string
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

// GetOrCreateByTelegramID gets existing user or creates a new one
func (s *UserService) GetOrCreateByTelegramID(ctx context.Context, tgUser *crypto.TelegramUser) (*UserWithLimits, error) {
	// Try to get existing user
	user, err := s.GetByTelegramID(ctx, tgUser.ID)
	if err != nil && !errors.IsAppError(err) {
		return nil, err
	}

	if user != nil {
		// Update user info and last active
		_, err = s.pool.Exec(ctx, `
			UPDATE users SET
				username = COALESCE($2, username),
				first_name = COALESCE($3, first_name),
				last_name = COALESCE($4, last_name),
				language_code = COALESCE($5, language_code),
				last_active_at = NOW()
			WHERE id = $1
		`, user.ID, nilIfEmpty(tgUser.Username), tgUser.FirstName, nilIfEmpty(tgUser.LastName), tgUser.LanguageCode)
		if err != nil {
			return nil, errors.Wrap(err, errors.ErrDatabase)
		}

		return s.GetWithLimits(ctx, user.ID)
	}

	// Create new user
	var userID int64
	err = s.pool.QueryRow(ctx, `
		INSERT INTO users (telegram_id, username, first_name, last_name, language_code)
		VALUES ($1, $2, $3, $4, $5)
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

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
