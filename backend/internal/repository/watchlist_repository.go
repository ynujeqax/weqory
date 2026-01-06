package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/weqory/backend/pkg/errors"
)

// WatchlistItem represents a user's watchlist item
type WatchlistItem struct {
	ID          int64
	UserID      int64
	CoinID      int64
	Coin        Coin
	AlertsCount int
	CreatedAt   time.Time
}

// WatchlistRepository handles watchlist database operations
type WatchlistRepository struct {
	pool *pgxpool.Pool
}

// NewWatchlistRepository creates a new WatchlistRepository
func NewWatchlistRepository(pool *pgxpool.Pool) *WatchlistRepository {
	return &WatchlistRepository{pool: pool}
}

// GetByUserID retrieves all watchlist items for a user
func (r *WatchlistRepository) GetByUserID(ctx context.Context, userID int64) ([]WatchlistItem, error) {
	query := `
		SELECT w.id, w.user_id, w.coin_id, w.created_at,
		       c.id, c.symbol, c.name, c.logo_url, c.current_price, c.price_change_1h,
		       c.price_change_24h, c.price_change_7d, c.market_cap, c.volume_24h,
		       c.rank, c.binance_symbol, c.is_active, c.created_at, c.updated_at,
		       (SELECT COUNT(*) FROM alerts a WHERE a.coin_id = c.id AND a.user_id = w.user_id AND a.is_deleted = false) as alerts_count
		FROM watchlist w
		JOIN coins c ON w.coin_id = c.id
		WHERE w.user_id = $1
		ORDER BY w.created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []WatchlistItem
	for rows.Next() {
		var item WatchlistItem
		err := rows.Scan(
			&item.ID, &item.UserID, &item.CoinID, &item.CreatedAt,
			&item.Coin.ID, &item.Coin.Symbol, &item.Coin.Name, &item.Coin.LogoURL,
			&item.Coin.CurrentPrice, &item.Coin.PriceChange1h, &item.Coin.PriceChange24h,
			&item.Coin.PriceChange7d, &item.Coin.MarketCap, &item.Coin.Volume24h,
			&item.Coin.Rank, &item.Coin.BinanceSymbol, &item.Coin.IsActive,
			&item.Coin.CreatedAt, &item.Coin.UpdatedAt, &item.AlertsCount,
		)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

// CountByUserID counts watchlist items for a user
func (r *WatchlistRepository) CountByUserID(ctx context.Context, userID int64) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM watchlist WHERE user_id = $1", userID).Scan(&count)
	return count, err
}

// ExistsByUserAndCoin checks if a coin is in user's watchlist
func (r *WatchlistRepository) ExistsByUserAndCoin(ctx context.Context, userID, coinID int64) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM watchlist WHERE user_id = $1 AND coin_id = $2)`
	err := r.pool.QueryRow(ctx, query, userID, coinID).Scan(&exists)
	return exists, err
}

// Add adds a coin to user's watchlist
func (r *WatchlistRepository) Add(ctx context.Context, userID, coinID int64) (*WatchlistItem, error) {
	query := `
		INSERT INTO watchlist (user_id, coin_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, coin_id) DO NOTHING
		RETURNING id, user_id, coin_id, created_at
	`
	var item WatchlistItem
	err := r.pool.QueryRow(ctx, query, userID, coinID).Scan(
		&item.ID, &item.UserID, &item.CoinID, &item.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.ErrCoinAlreadyInWatchlist
		}
		return nil, err
	}
	return &item, nil
}

// Remove removes a coin from user's watchlist
func (r *WatchlistRepository) Remove(ctx context.Context, userID, coinID int64) error {
	result, err := r.pool.Exec(ctx, "DELETE FROM watchlist WHERE user_id = $1 AND coin_id = $2", userID, coinID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return errors.ErrCoinNotInWatchlist
	}
	return nil
}

// DeleteAllByUser removes all coins from user's watchlist
func (r *WatchlistRepository) DeleteAllByUser(ctx context.Context, userID int64) (int64, error) {
	result, err := r.pool.Exec(ctx, "DELETE FROM watchlist WHERE user_id = $1", userID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

// GetCoinIDBySymbol gets coin ID from watchlist by symbol
func (r *WatchlistRepository) GetCoinIDBySymbol(ctx context.Context, userID int64, symbol string) (int64, error) {
	query := `
		SELECT w.coin_id FROM watchlist w
		JOIN coins c ON w.coin_id = c.id
		WHERE w.user_id = $1 AND c.symbol = $2
	`
	var coinID int64
	err := r.pool.QueryRow(ctx, query, userID, symbol).Scan(&coinID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return 0, errors.ErrCoinNotInWatchlist
		}
		return 0, err
	}
	return coinID, nil
}
