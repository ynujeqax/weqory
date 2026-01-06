package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/weqory/backend/pkg/errors"
)

// Alert represents a price alert
type Alert struct {
	ID                 int64
	UserID             int64
	CoinID             int64
	Coin               Coin
	AlertType          string
	ConditionOperator  string
	ConditionValue     float64
	ConditionTimeframe *string
	IsRecurring        bool
	IsPaused           bool
	PeriodicInterval   *string
	TimesTriggered     int
	LastTriggeredAt    *time.Time
	PriceWhenCreated   float64
	IsDeleted          bool
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

// AlertRepository handles alert database operations
type AlertRepository struct {
	pool *pgxpool.Pool
}

// NewAlertRepository creates a new AlertRepository
func NewAlertRepository(pool *pgxpool.Pool) *AlertRepository {
	return &AlertRepository{pool: pool}
}

// GetByID retrieves an alert by ID
func (r *AlertRepository) GetByID(ctx context.Context, id int64) (*Alert, error) {
	query := `
		SELECT a.id, a.user_id, a.coin_id, a.alert_type, a.condition_operator, a.condition_value,
		       a.condition_timeframe, a.is_recurring, a.is_paused, a.periodic_interval,
		       a.times_triggered, a.last_triggered_at, a.price_when_created, a.is_deleted,
		       a.created_at, a.updated_at,
		       c.id, c.symbol, c.name, c.logo_url, c.current_price, c.price_change_1h,
		       c.price_change_24h, c.price_change_7d, c.market_cap, c.volume_24h,
		       c.rank, c.binance_symbol, c.is_active, c.created_at, c.updated_at
		FROM alerts a
		JOIN coins c ON a.coin_id = c.id
		WHERE a.id = $1 AND a.is_deleted = false
	`
	var alert Alert
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&alert.ID, &alert.UserID, &alert.CoinID, &alert.AlertType, &alert.ConditionOperator,
		&alert.ConditionValue, &alert.ConditionTimeframe, &alert.IsRecurring, &alert.IsPaused,
		&alert.PeriodicInterval, &alert.TimesTriggered, &alert.LastTriggeredAt,
		&alert.PriceWhenCreated, &alert.IsDeleted, &alert.CreatedAt, &alert.UpdatedAt,
		&alert.Coin.ID, &alert.Coin.Symbol, &alert.Coin.Name, &alert.Coin.LogoURL,
		&alert.Coin.CurrentPrice, &alert.Coin.PriceChange1h, &alert.Coin.PriceChange24h,
		&alert.Coin.PriceChange7d, &alert.Coin.MarketCap, &alert.Coin.Volume24h,
		&alert.Coin.Rank, &alert.Coin.BinanceSymbol, &alert.Coin.IsActive,
		&alert.Coin.CreatedAt, &alert.Coin.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.ErrAlertNotFound
		}
		return nil, err
	}
	return &alert, nil
}

// GetByUserID retrieves all alerts for a user
func (r *AlertRepository) GetByUserID(ctx context.Context, userID int64) ([]Alert, error) {
	query := `
		SELECT a.id, a.user_id, a.coin_id, a.alert_type, a.condition_operator, a.condition_value,
		       a.condition_timeframe, a.is_recurring, a.is_paused, a.periodic_interval,
		       a.times_triggered, a.last_triggered_at, a.price_when_created, a.is_deleted,
		       a.created_at, a.updated_at,
		       c.id, c.symbol, c.name, c.logo_url, c.current_price, c.price_change_1h,
		       c.price_change_24h, c.price_change_7d, c.market_cap, c.volume_24h,
		       c.rank, c.binance_symbol, c.is_active, c.created_at, c.updated_at
		FROM alerts a
		JOIN coins c ON a.coin_id = c.id
		WHERE a.user_id = $1 AND a.is_deleted = false
		ORDER BY a.created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var alerts []Alert
	for rows.Next() {
		var alert Alert
		err := rows.Scan(
			&alert.ID, &alert.UserID, &alert.CoinID, &alert.AlertType, &alert.ConditionOperator,
			&alert.ConditionValue, &alert.ConditionTimeframe, &alert.IsRecurring, &alert.IsPaused,
			&alert.PeriodicInterval, &alert.TimesTriggered, &alert.LastTriggeredAt,
			&alert.PriceWhenCreated, &alert.IsDeleted, &alert.CreatedAt, &alert.UpdatedAt,
			&alert.Coin.ID, &alert.Coin.Symbol, &alert.Coin.Name, &alert.Coin.LogoURL,
			&alert.Coin.CurrentPrice, &alert.Coin.PriceChange1h, &alert.Coin.PriceChange24h,
			&alert.Coin.PriceChange7d, &alert.Coin.MarketCap, &alert.Coin.Volume24h,
			&alert.Coin.Rank, &alert.Coin.BinanceSymbol, &alert.Coin.IsActive,
			&alert.Coin.CreatedAt, &alert.Coin.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		alerts = append(alerts, alert)
	}
	return alerts, nil
}

// CountByUserID counts alerts for a user
func (r *AlertRepository) CountByUserID(ctx context.Context, userID int64) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM alerts WHERE user_id = $1 AND is_deleted = false", userID).Scan(&count)
	return count, err
}

// Create creates a new alert
func (r *AlertRepository) Create(ctx context.Context, alert *Alert) error {
	query := `
		INSERT INTO alerts (user_id, coin_id, alert_type, condition_operator, condition_value,
		                    condition_timeframe, is_recurring, periodic_interval, price_when_created)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, is_paused, times_triggered, is_deleted, created_at, updated_at
	`
	return r.pool.QueryRow(ctx, query,
		alert.UserID, alert.CoinID, alert.AlertType, alert.ConditionOperator, alert.ConditionValue,
		alert.ConditionTimeframe, alert.IsRecurring, alert.PeriodicInterval, alert.PriceWhenCreated,
	).Scan(&alert.ID, &alert.IsPaused, &alert.TimesTriggered, &alert.IsDeleted, &alert.CreatedAt, &alert.UpdatedAt)
}

// UpdatePaused updates the paused status of an alert
func (r *AlertRepository) UpdatePaused(ctx context.Context, id int64, isPaused bool) (*Alert, error) {
	query := `
		UPDATE alerts SET is_paused = $2, updated_at = NOW()
		WHERE id = $1 AND is_deleted = false
		RETURNING id, user_id, coin_id, alert_type, condition_operator, condition_value,
		          condition_timeframe, is_recurring, is_paused, periodic_interval,
		          times_triggered, last_triggered_at, price_when_created, is_deleted, created_at, updated_at
	`
	var alert Alert
	err := r.pool.QueryRow(ctx, query, id, isPaused).Scan(
		&alert.ID, &alert.UserID, &alert.CoinID, &alert.AlertType, &alert.ConditionOperator,
		&alert.ConditionValue, &alert.ConditionTimeframe, &alert.IsRecurring, &alert.IsPaused,
		&alert.PeriodicInterval, &alert.TimesTriggered, &alert.LastTriggeredAt,
		&alert.PriceWhenCreated, &alert.IsDeleted, &alert.CreatedAt, &alert.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.ErrAlertNotFound
		}
		return nil, err
	}
	return &alert, nil
}

// MarkTriggered marks an alert as triggered
func (r *AlertRepository) MarkTriggered(ctx context.Context, id int64) error {
	query := `
		UPDATE alerts
		SET times_triggered = times_triggered + 1, last_triggered_at = NOW(), updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query, id)
	return err
}

// Delete soft deletes an alert
func (r *AlertRepository) Delete(ctx context.Context, id int64) error {
	result, err := r.pool.Exec(ctx, "UPDATE alerts SET is_deleted = true, updated_at = NOW() WHERE id = $1 AND is_deleted = false", id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return errors.ErrAlertNotFound
	}
	return nil
}

// DeleteAllByUser soft deletes all alerts for a user
func (r *AlertRepository) DeleteAllByUser(ctx context.Context, userID int64) (int64, error) {
	result, err := r.pool.Exec(ctx, "UPDATE alerts SET is_deleted = true, updated_at = NOW() WHERE user_id = $1 AND is_deleted = false", userID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

// DeleteByCoin soft deletes all alerts for a coin for a user
func (r *AlertRepository) DeleteByCoin(ctx context.Context, userID, coinID int64) (int64, error) {
	result, err := r.pool.Exec(ctx, "UPDATE alerts SET is_deleted = true, updated_at = NOW() WHERE user_id = $1 AND coin_id = $2 AND is_deleted = false", userID, coinID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

// GetActiveAlerts retrieves all active alerts (for alert engine)
func (r *AlertRepository) GetActiveAlerts(ctx context.Context) ([]Alert, error) {
	query := `
		SELECT a.id, a.user_id, a.coin_id, a.alert_type, a.condition_operator, a.condition_value,
		       a.condition_timeframe, a.is_recurring, a.is_paused, a.periodic_interval,
		       a.times_triggered, a.last_triggered_at, a.price_when_created, a.is_deleted,
		       a.created_at, a.updated_at,
		       c.id, c.symbol, c.name, c.logo_url, c.current_price, c.price_change_1h,
		       c.price_change_24h, c.price_change_7d, c.market_cap, c.volume_24h,
		       c.rank, c.binance_symbol, c.is_active, c.created_at, c.updated_at
		FROM alerts a
		JOIN coins c ON a.coin_id = c.id
		WHERE a.is_deleted = false AND a.is_paused = false
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var alerts []Alert
	for rows.Next() {
		var alert Alert
		err := rows.Scan(
			&alert.ID, &alert.UserID, &alert.CoinID, &alert.AlertType, &alert.ConditionOperator,
			&alert.ConditionValue, &alert.ConditionTimeframe, &alert.IsRecurring, &alert.IsPaused,
			&alert.PeriodicInterval, &alert.TimesTriggered, &alert.LastTriggeredAt,
			&alert.PriceWhenCreated, &alert.IsDeleted, &alert.CreatedAt, &alert.UpdatedAt,
			&alert.Coin.ID, &alert.Coin.Symbol, &alert.Coin.Name, &alert.Coin.LogoURL,
			&alert.Coin.CurrentPrice, &alert.Coin.PriceChange1h, &alert.Coin.PriceChange24h,
			&alert.Coin.PriceChange7d, &alert.Coin.MarketCap, &alert.Coin.Volume24h,
			&alert.Coin.Rank, &alert.Coin.BinanceSymbol, &alert.Coin.IsActive,
			&alert.Coin.CreatedAt, &alert.Coin.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		alerts = append(alerts, alert)
	}
	return alerts, nil
}
