package service

import (
	"context"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/weqory/backend/pkg/errors"
)

// AlertService handles alert-related business logic
type AlertService struct {
	pool             *pgxpool.Pool
	userService      *UserService
	watchlistService *WatchlistService
}

// NewAlertService creates a new AlertService
func NewAlertService(pool *pgxpool.Pool, userService *UserService, watchlistService *WatchlistService) *AlertService {
	return &AlertService{
		pool:             pool,
		userService:      userService,
		watchlistService: watchlistService,
	}
}

// Alert represents an alert from the database
type Alert struct {
	ID                 int64
	UserID             int64
	CoinID             int
	Coin               Coin
	AlertType          string
	ConditionOperator  string
	ConditionValue     float64
	ConditionTimeframe *string
	IsRecurring        bool
	IsPaused           bool
	PeriodicInterval   *string
	TimesTriggered     int
	LastTriggeredAt    *string
	PriceWhenCreated   *float64
	CreatedAt          string
	UpdatedAt          string
}

// CreateAlertParams represents parameters for creating an alert
type CreateAlertParams struct {
	CoinSymbol         string
	AlertType          string
	ConditionValue     float64
	ConditionTimeframe *string
	IsRecurring        bool
	PeriodicInterval   *string
}

// GetByUserID retrieves all alerts for a user
func (s *AlertService) GetByUserID(ctx context.Context, userID int64) ([]Alert, error) {
	query := `
		SELECT
			a.id, a.user_id, a.coin_id,
			a.alert_type, a.condition_operator, a.condition_value, a.condition_timeframe,
			a.is_recurring, a.is_paused, a.periodic_interval,
			a.times_triggered, a.last_triggered_at, a.price_when_created,
			a.created_at, a.updated_at,
			c.id, c.symbol, c.name, c.binance_symbol, c.current_price
		FROM alerts a
		JOIN coins c ON c.id = a.coin_id
		WHERE a.user_id = $1
		ORDER BY a.created_at DESC
	`

	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrDatabase)
	}
	defer rows.Close()

	var alerts []Alert
	for rows.Next() {
		var alert Alert
		err := rows.Scan(
			&alert.ID, &alert.UserID, &alert.CoinID,
			&alert.AlertType, &alert.ConditionOperator, &alert.ConditionValue, &alert.ConditionTimeframe,
			&alert.IsRecurring, &alert.IsPaused, &alert.PeriodicInterval,
			&alert.TimesTriggered, &alert.LastTriggeredAt, &alert.PriceWhenCreated,
			&alert.CreatedAt, &alert.UpdatedAt,
			&alert.Coin.ID, &alert.Coin.Symbol, &alert.Coin.Name, &alert.Coin.BinanceSymbol, &alert.Coin.CurrentPrice,
		)
		if err != nil {
			return nil, errors.Wrap(err, errors.ErrDatabase)
		}
		alerts = append(alerts, alert)
	}

	if alerts == nil {
		alerts = []Alert{}
	}

	return alerts, nil
}

// GetByID retrieves an alert by ID
func (s *AlertService) GetByID(ctx context.Context, alertID int64) (*Alert, error) {
	query := `
		SELECT
			a.id, a.user_id, a.coin_id,
			a.alert_type, a.condition_operator, a.condition_value, a.condition_timeframe,
			a.is_recurring, a.is_paused, a.periodic_interval,
			a.times_triggered, a.last_triggered_at, a.price_when_created,
			a.created_at, a.updated_at,
			c.id, c.symbol, c.name, c.binance_symbol, c.current_price
		FROM alerts a
		JOIN coins c ON c.id = a.coin_id
		WHERE a.id = $1
	`

	var alert Alert
	err := s.pool.QueryRow(ctx, query, alertID).Scan(
		&alert.ID, &alert.UserID, &alert.CoinID,
		&alert.AlertType, &alert.ConditionOperator, &alert.ConditionValue, &alert.ConditionTimeframe,
		&alert.IsRecurring, &alert.IsPaused, &alert.PeriodicInterval,
		&alert.TimesTriggered, &alert.LastTriggeredAt, &alert.PriceWhenCreated,
		&alert.CreatedAt, &alert.UpdatedAt,
		&alert.Coin.ID, &alert.Coin.Symbol, &alert.Coin.Name, &alert.Coin.BinanceSymbol, &alert.Coin.CurrentPrice,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.ErrAlertNotFound
		}
		return nil, errors.Wrap(err, errors.ErrDatabase)
	}

	return &alert, nil
}

// Create creates a new alert
func (s *AlertService) Create(ctx context.Context, userID int64, params CreateAlertParams) (*Alert, error) {
	// Sanitize symbol
	coinSymbol := strings.ToUpper(strings.TrimSpace(params.CoinSymbol))

	// Check if plan expired and downgrade if needed
	_, err := s.userService.CheckAndDowngradeExpiredPlan(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Check user limits (with possibly updated plan)
	user, err := s.userService.GetWithLimits(ctx, userID)
	if err != nil {
		return nil, err
	}

	if user.AlertsUsed >= int64(user.MaxAlerts) {
		return nil, errors.ErrAlertLimitExceeded.WithMessage(
			"Alert limit reached. Upgrade your plan to create more alerts.",
		)
	}

	// Get coin and verify it's in watchlist
	var coinID int
	var currentPrice *float64
	err = s.pool.QueryRow(ctx, `
		SELECT c.id, c.current_price
		FROM coins c
		JOIN watchlist w ON w.coin_id = c.id AND w.user_id = $1
		WHERE c.symbol = $2
	`, userID, coinSymbol).Scan(&coinID, &currentPrice)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.ErrBadRequest.WithMessage("Coin not in watchlist. Add it first.")
		}
		return nil, errors.Wrap(err, errors.ErrDatabase)
	}

	// Determine condition operator based on alert type
	conditionOperator := getConditionOperator(params.AlertType)

	// Insert alert
	var alertID int64
	var createdAt, updatedAt string
	err = s.pool.QueryRow(ctx, `
		INSERT INTO alerts (
			user_id, coin_id, alert_type, condition_operator,
			condition_value, condition_timeframe, is_recurring,
			periodic_interval, price_when_created
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at
	`,
		userID, coinID, params.AlertType, conditionOperator,
		params.ConditionValue, params.ConditionTimeframe, params.IsRecurring,
		params.PeriodicInterval, currentPrice,
	).Scan(&alertID, &createdAt, &updatedAt)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrDatabase)
	}

	return s.GetByID(ctx, alertID)
}

// UpdatePaused updates alert paused status
func (s *AlertService) UpdatePaused(ctx context.Context, userID, alertID int64, isPaused bool) (*Alert, error) {
	// Verify ownership
	var ownerID int64
	err := s.pool.QueryRow(ctx, `SELECT user_id FROM alerts WHERE id = $1`, alertID).Scan(&ownerID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.ErrAlertNotFound
		}
		return nil, errors.Wrap(err, errors.ErrDatabase)
	}

	if ownerID != userID {
		return nil, errors.ErrNotOwner
	}

	// Update
	_, err = s.pool.Exec(ctx, `
		UPDATE alerts SET is_paused = $2, updated_at = NOW() WHERE id = $1
	`, alertID, isPaused)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrDatabase)
	}

	return s.GetByID(ctx, alertID)
}

// Delete deletes an alert
func (s *AlertService) Delete(ctx context.Context, userID, alertID int64) error {
	// Verify ownership
	var ownerID int64
	err := s.pool.QueryRow(ctx, `SELECT user_id FROM alerts WHERE id = $1`, alertID).Scan(&ownerID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return errors.ErrAlertNotFound
		}
		return errors.Wrap(err, errors.ErrDatabase)
	}

	if ownerID != userID {
		return errors.ErrNotOwner
	}

	_, err = s.pool.Exec(ctx, `DELETE FROM alerts WHERE id = $1`, alertID)
	if err != nil {
		return errors.Wrap(err, errors.ErrDatabase)
	}

	return nil
}

// DeleteAllByUser deletes all alerts for a user
func (s *AlertService) DeleteAllByUser(ctx context.Context, userID int64) (int64, error) {
	result, err := s.pool.Exec(ctx, `DELETE FROM alerts WHERE user_id = $1`, userID)
	if err != nil {
		return 0, errors.Wrap(err, errors.ErrDatabase)
	}
	return result.RowsAffected(), nil
}

func getConditionOperator(alertType string) string {
	switch alertType {
	case "PRICE_ABOVE", "MARKET_CAP_ABOVE":
		return "above"
	case "PRICE_BELOW", "MARKET_CAP_BELOW":
		return "below"
	default:
		return "change"
	}
}
