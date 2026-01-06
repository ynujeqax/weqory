package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// AlertHistory represents a triggered alert history record
type AlertHistory struct {
	ID                 int64
	AlertID            int64
	UserID             int64
	CoinID             int64
	Coin               Coin
	AlertType          string
	ConditionOperator  string
	ConditionValue     float64
	ConditionTimeframe *string
	TriggeredPrice     float64
	TriggeredAt        time.Time
	Notified           bool
	CreatedAt          time.Time
}

// HistoryRepository handles alert history database operations
type HistoryRepository struct {
	pool *pgxpool.Pool
}

// NewHistoryRepository creates a new HistoryRepository
func NewHistoryRepository(pool *pgxpool.Pool) *HistoryRepository {
	return &HistoryRepository{pool: pool}
}

// GetByUserID retrieves alert history for a user with pagination
func (r *HistoryRepository) GetByUserID(ctx context.Context, userID int64, limit, offset int) ([]AlertHistory, int64, error) {
	// Get total count
	var total int64
	err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM alert_history WHERE user_id = $1", userID).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Get history items
	query := `
		SELECT h.id, h.alert_id, h.user_id, h.coin_id, h.alert_type, h.condition_operator,
		       h.condition_value, h.condition_timeframe, h.triggered_price, h.triggered_at,
		       h.notified, h.created_at,
		       c.id, c.symbol, c.name, c.logo_url, c.current_price, c.price_change_1h,
		       c.price_change_24h, c.price_change_7d, c.market_cap, c.volume_24h,
		       c.rank, c.binance_symbol, c.is_active, c.created_at, c.updated_at
		FROM alert_history h
		JOIN coins c ON h.coin_id = c.id
		WHERE h.user_id = $1
		ORDER BY h.triggered_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var items []AlertHistory
	for rows.Next() {
		var item AlertHistory
		err := rows.Scan(
			&item.ID, &item.AlertID, &item.UserID, &item.CoinID, &item.AlertType,
			&item.ConditionOperator, &item.ConditionValue, &item.ConditionTimeframe,
			&item.TriggeredPrice, &item.TriggeredAt, &item.Notified, &item.CreatedAt,
			&item.Coin.ID, &item.Coin.Symbol, &item.Coin.Name, &item.Coin.LogoURL,
			&item.Coin.CurrentPrice, &item.Coin.PriceChange1h, &item.Coin.PriceChange24h,
			&item.Coin.PriceChange7d, &item.Coin.MarketCap, &item.Coin.Volume24h,
			&item.Coin.Rank, &item.Coin.BinanceSymbol, &item.Coin.IsActive,
			&item.Coin.CreatedAt, &item.Coin.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	return items, total, nil
}

// Create creates a new history record
func (r *HistoryRepository) Create(ctx context.Context, history *AlertHistory) error {
	query := `
		INSERT INTO alert_history (alert_id, user_id, coin_id, alert_type, condition_operator,
		                           condition_value, condition_timeframe, triggered_price, notified)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, triggered_at, created_at
	`
	return r.pool.QueryRow(ctx, query,
		history.AlertID, history.UserID, history.CoinID, history.AlertType,
		history.ConditionOperator, history.ConditionValue, history.ConditionTimeframe,
		history.TriggeredPrice, history.Notified,
	).Scan(&history.ID, &history.TriggeredAt, &history.CreatedAt)
}

// DeleteAllByUser deletes all history for a user
func (r *HistoryRepository) DeleteAllByUser(ctx context.Context, userID int64) (int64, error) {
	result, err := r.pool.Exec(ctx, "DELETE FROM alert_history WHERE user_id = $1", userID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

// DeleteOlderThan deletes history records older than the specified duration
func (r *HistoryRepository) DeleteOlderThan(ctx context.Context, userID int64, days int) (int64, error) {
	query := `DELETE FROM alert_history WHERE user_id = $1 AND triggered_at < NOW() - INTERVAL '1 day' * $2`
	result, err := r.pool.Exec(ctx, query, userID, days)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

// MarkNotified marks a history record as notified
func (r *HistoryRepository) MarkNotified(ctx context.Context, id int64) error {
	_, err := r.pool.Exec(ctx, "UPDATE alert_history SET notified = true WHERE id = $1", id)
	return err
}
