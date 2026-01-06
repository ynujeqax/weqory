package service

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/weqory/backend/pkg/errors"
)

// HistoryService handles alert history-related business logic
type HistoryService struct {
	pool        *pgxpool.Pool
	userService *UserService
}

// NewHistoryService creates a new HistoryService
func NewHistoryService(pool *pgxpool.Pool, userService *UserService) *HistoryService {
	return &HistoryService{
		pool:        pool,
		userService: userService,
	}
}

// AlertHistory represents an alert history entry
type AlertHistory struct {
	ID                 int64
	UserID             int64
	AlertID            *int64
	CoinID             int
	Coin               Coin
	AlertType          string
	ConditionOperator  string
	ConditionValue     float64
	ConditionTimeframe *string
	TriggeredPrice     float64
	TriggeredAt        string
	NotificationSent   bool
	NotificationError  *string
}

// GetByUserID retrieves alert history for a user
func (s *HistoryService) GetByUserID(ctx context.Context, userID int64, limit, offset int) ([]AlertHistory, int64, error) {
	// Get user to check retention
	user, err := s.userService.GetWithLimits(ctx, userID)
	if err != nil {
		return nil, 0, err
	}

	// Get total count
	var total int64
	err = s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM alert_history
		WHERE user_id = $1
		  AND triggered_at > NOW() - INTERVAL '1 day' * $2
	`, userID, user.HistoryRetentionDays).Scan(&total)
	if err != nil {
		return nil, 0, errors.Wrap(err, errors.ErrDatabase)
	}

	// Get history items
	query := `
		SELECT
			h.id, h.user_id, h.alert_id, h.coin_id,
			h.alert_type, h.condition_operator, h.condition_value, h.condition_timeframe,
			h.triggered_price, h.triggered_at,
			h.notification_sent, h.notification_error,
			c.id, c.symbol, c.name, c.binance_symbol
		FROM alert_history h
		JOIN coins c ON c.id = h.coin_id
		WHERE h.user_id = $1
		  AND h.triggered_at > NOW() - INTERVAL '1 day' * $2
		ORDER BY h.triggered_at DESC
		LIMIT $3 OFFSET $4
	`

	rows, err := s.pool.Query(ctx, query, userID, user.HistoryRetentionDays, limit, offset)
	if err != nil {
		return nil, 0, errors.Wrap(err, errors.ErrDatabase)
	}
	defer rows.Close()

	var history []AlertHistory
	for rows.Next() {
		var h AlertHistory
		err := rows.Scan(
			&h.ID, &h.UserID, &h.AlertID, &h.CoinID,
			&h.AlertType, &h.ConditionOperator, &h.ConditionValue, &h.ConditionTimeframe,
			&h.TriggeredPrice, &h.TriggeredAt,
			&h.NotificationSent, &h.NotificationError,
			&h.Coin.ID, &h.Coin.Symbol, &h.Coin.Name, &h.Coin.BinanceSymbol,
		)
		if err != nil {
			return nil, 0, errors.Wrap(err, errors.ErrDatabase)
		}
		history = append(history, h)
	}

	if history == nil {
		history = []AlertHistory{}
	}

	return history, total, nil
}

// DeleteAllByUser deletes all history for a user
func (s *HistoryService) DeleteAllByUser(ctx context.Context, userID int64) (int64, error) {
	result, err := s.pool.Exec(ctx, `DELETE FROM alert_history WHERE user_id = $1`, userID)
	if err != nil {
		return 0, errors.Wrap(err, errors.ErrDatabase)
	}
	return result.RowsAffected(), nil
}

// GetRetentionDays returns retention days for a user's plan
func (s *HistoryService) GetRetentionDays(ctx context.Context, userID int64) (int, error) {
	user, err := s.userService.GetWithLimits(ctx, userID)
	if err != nil {
		return 0, err
	}
	return user.HistoryRetentionDays, nil
}
