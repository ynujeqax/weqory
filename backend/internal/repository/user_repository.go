package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/weqory/backend/pkg/errors"
)

// User represents a user in the database
type User struct {
	ID                   int64
	TelegramID           int64
	Username             *string
	FirstName            *string
	LastName             *string
	LanguageCode         *string
	PhotoURL             *string
	Plan                 string
	NotificationsUsed    int
	NotificationsEnabled bool
	VibrationEnabled     bool
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

// UserRepository handles user database operations
type UserRepository struct {
	pool *pgxpool.Pool
}

// NewUserRepository creates a new UserRepository
func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

// GetByID retrieves a user by ID
func (r *UserRepository) GetByID(ctx context.Context, id int64) (*User, error) {
	query := `
		SELECT id, telegram_id, username, first_name, last_name, language_code, photo_url,
		       plan, notifications_used, notifications_enabled, vibration_enabled, created_at, updated_at
		FROM users WHERE id = $1
	`
	var user User
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&user.ID, &user.TelegramID, &user.Username, &user.FirstName, &user.LastName,
		&user.LanguageCode, &user.PhotoURL, &user.Plan, &user.NotificationsUsed,
		&user.NotificationsEnabled, &user.VibrationEnabled, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

// GetByTelegramID retrieves a user by Telegram ID
func (r *UserRepository) GetByTelegramID(ctx context.Context, telegramID int64) (*User, error) {
	query := `
		SELECT id, telegram_id, username, first_name, last_name, language_code, photo_url,
		       plan, notifications_used, notifications_enabled, vibration_enabled, created_at, updated_at
		FROM users WHERE telegram_id = $1
	`
	var user User
	err := r.pool.QueryRow(ctx, query, telegramID).Scan(
		&user.ID, &user.TelegramID, &user.Username, &user.FirstName, &user.LastName,
		&user.LanguageCode, &user.PhotoURL, &user.Plan, &user.NotificationsUsed,
		&user.NotificationsEnabled, &user.VibrationEnabled, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

// Create creates a new user
func (r *UserRepository) Create(ctx context.Context, user *User) error {
	query := `
		INSERT INTO users (telegram_id, username, first_name, last_name, language_code, photo_url, plan)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at
	`
	return r.pool.QueryRow(ctx, query,
		user.TelegramID, user.Username, user.FirstName, user.LastName,
		user.LanguageCode, user.PhotoURL, user.Plan,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
}

// Update updates user info
func (r *UserRepository) Update(ctx context.Context, user *User) error {
	query := `
		UPDATE users
		SET username = $2, first_name = $3, last_name = $4, language_code = $5, photo_url = $6, updated_at = NOW()
		WHERE id = $1
		RETURNING updated_at
	`
	return r.pool.QueryRow(ctx, query,
		user.ID, user.Username, user.FirstName, user.LastName, user.LanguageCode, user.PhotoURL,
	).Scan(&user.UpdatedAt)
}

// UpdateSettings updates user notification settings
func (r *UserRepository) UpdateSettings(ctx context.Context, userID int64, notificationsEnabled, vibrationEnabled bool) (*User, error) {
	query := `
		UPDATE users
		SET notifications_enabled = $2, vibration_enabled = $3, updated_at = NOW()
		WHERE id = $1
		RETURNING id, telegram_id, username, first_name, last_name, language_code, photo_url,
		          plan, notifications_used, notifications_enabled, vibration_enabled, created_at, updated_at
	`
	var user User
	err := r.pool.QueryRow(ctx, query, userID, notificationsEnabled, vibrationEnabled).Scan(
		&user.ID, &user.TelegramID, &user.Username, &user.FirstName, &user.LastName,
		&user.LanguageCode, &user.PhotoURL, &user.Plan, &user.NotificationsUsed,
		&user.NotificationsEnabled, &user.VibrationEnabled, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

// UpdatePlan updates user plan
func (r *UserRepository) UpdatePlan(ctx context.Context, userID int64, plan string) error {
	query := `UPDATE users SET plan = $2, updated_at = NOW() WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, userID, plan)
	return err
}

// IncrementNotifications increments the notifications used counter
func (r *UserRepository) IncrementNotifications(ctx context.Context, userID int64) error {
	query := `UPDATE users SET notifications_used = notifications_used + 1, updated_at = NOW() WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, userID)
	return err
}

// ResetNotificationsUsed resets the notifications used counter (called monthly)
func (r *UserRepository) ResetNotificationsUsed(ctx context.Context, userID int64) error {
	query := `UPDATE users SET notifications_used = 0, updated_at = NOW() WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, userID)
	return err
}
