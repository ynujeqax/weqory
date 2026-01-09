package service

import (
	"context"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/weqory/backend/pkg/errors"
)

// WatchlistService handles watchlist-related business logic
type WatchlistService struct {
	pool        *pgxpool.Pool
	userService *UserService
}

// NewWatchlistService creates a new WatchlistService
func NewWatchlistService(pool *pgxpool.Pool, userService *UserService) *WatchlistService {
	return &WatchlistService{
		pool:        pool,
		userService: userService,
	}
}

// Coin represents a coin from the database
type Coin struct {
	ID               int
	Symbol           string
	Name             string
	BinanceSymbol    string
	IsStablecoin     bool
	Rank             *int
	CurrentPrice     *float64
	MarketCap        *float64
	Volume24h        *float64
	PriceChange24hPct *float64
}

// WatchlistItem represents a watchlist item
type WatchlistItem struct {
	ID          int64
	UserID      int64
	CoinID      int
	Coin        Coin
	AlertsCount int64
	CreatedAt   string
}

// GetByUserID retrieves user's watchlist
func (s *WatchlistService) GetByUserID(ctx context.Context, userID int64) ([]WatchlistItem, error) {
	// Cleanup orphaned entries first
	_ = s.CleanupOrphanedEntries(ctx, userID)

	query := `
		SELECT
			w.id, w.user_id, w.coin_id, w.created_at,
			c.id, c.symbol, c.name, c.binance_symbol,
			c.rank_by_market_cap, c.current_price, c.market_cap,
			c.volume_24h, c.price_change_24h_pct,
			(SELECT COUNT(*) FROM alerts a WHERE a.user_id = w.user_id AND a.coin_id = w.coin_id) as alerts_count
		FROM watchlist w
		JOIN coins c ON c.id = w.coin_id
		WHERE w.user_id = $1
		ORDER BY w.created_at DESC
	`

	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrDatabase)
	}
	defer rows.Close()

	var items []WatchlistItem
	for rows.Next() {
		var item WatchlistItem
		err := rows.Scan(
			&item.ID, &item.UserID, &item.CoinID, &item.CreatedAt,
			&item.Coin.ID, &item.Coin.Symbol, &item.Coin.Name, &item.Coin.BinanceSymbol,
			&item.Coin.Rank, &item.Coin.CurrentPrice, &item.Coin.MarketCap,
			&item.Coin.Volume24h, &item.Coin.PriceChange24hPct,
			&item.AlertsCount,
		)
		if err != nil {
			return nil, errors.Wrap(err, errors.ErrDatabase)
		}
		items = append(items, item)
	}

	if items == nil {
		items = []WatchlistItem{}
	}

	return items, nil
}

// AddCoin adds a coin to user's watchlist
func (s *WatchlistService) AddCoin(ctx context.Context, userID int64, coinSymbol string) (*WatchlistItem, error) {
	// Sanitize symbol
	coinSymbol = strings.ToUpper(strings.TrimSpace(coinSymbol))

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

	if user.CoinsUsed >= int64(user.MaxCoins) {
		return nil, errors.ErrWatchlistLimitExceeded.WithMessage(
			"Watchlist limit reached. Upgrade your plan to add more coins.",
		)
	}

	// Get coin by symbol
	var coin Coin
	err = s.pool.QueryRow(ctx, `
		SELECT id, symbol, name, binance_symbol, rank_by_market_cap,
		       current_price, market_cap, volume_24h, price_change_24h_pct
		FROM coins WHERE symbol = $1 AND is_stablecoin = false
	`, coinSymbol).Scan(
		&coin.ID, &coin.Symbol, &coin.Name, &coin.BinanceSymbol, &coin.Rank,
		&coin.CurrentPrice, &coin.MarketCap, &coin.Volume24h, &coin.PriceChange24hPct,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.ErrCoinNotFound
		}
		return nil, errors.Wrap(err, errors.ErrDatabase)
	}

	// Check if already in watchlist
	var exists bool
	err = s.pool.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM watchlist WHERE user_id = $1 AND coin_id = $2)
	`, userID, coin.ID).Scan(&exists)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrDatabase)
	}
	if exists {
		return nil, errors.ErrCoinInWatchlist
	}

	// Add to watchlist
	var item WatchlistItem
	err = s.pool.QueryRow(ctx, `
		INSERT INTO watchlist (user_id, coin_id)
		VALUES ($1, $2)
		RETURNING id, user_id, coin_id, created_at
	`, userID, coin.ID).Scan(&item.ID, &item.UserID, &item.CoinID, &item.CreatedAt)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrDatabase)
	}

	item.Coin = coin
	item.AlertsCount = 0

	return &item, nil
}

// RemoveCoin removes a coin from user's watchlist (and its alerts)
func (s *WatchlistService) RemoveCoin(ctx context.Context, userID int64, coinSymbol string) (int64, error) {
	coinSymbol = strings.ToUpper(strings.TrimSpace(coinSymbol))

	// Get coin ID
	var coinID int
	err := s.pool.QueryRow(ctx, `SELECT id FROM coins WHERE symbol = $1`, coinSymbol).Scan(&coinID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return 0, errors.ErrCoinNotFound
		}
		return 0, errors.Wrap(err, errors.ErrDatabase)
	}

	// Start transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, errors.Wrap(err, errors.ErrDatabase)
	}
	defer tx.Rollback(ctx)

	// Delete alerts for this coin
	var deletedAlerts int64
	err = tx.QueryRow(ctx, `
		WITH deleted AS (
			DELETE FROM alerts WHERE user_id = $1 AND coin_id = $2
			RETURNING id
		)
		SELECT COUNT(*) FROM deleted
	`, userID, coinID).Scan(&deletedAlerts)
	if err != nil {
		return 0, errors.Wrap(err, errors.ErrDatabase)
	}

	// Delete from watchlist
	result, err := tx.Exec(ctx, `
		DELETE FROM watchlist WHERE user_id = $1 AND coin_id = $2
	`, userID, coinID)
	if err != nil {
		return 0, errors.Wrap(err, errors.ErrDatabase)
	}

	if result.RowsAffected() == 0 {
		return 0, errors.ErrNotFound.WithMessage("Coin not in watchlist")
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, errors.Wrap(err, errors.ErrDatabase)
	}

	return deletedAlerts, nil
}

// GetAvailableCoins returns coins that can be added to watchlist
func (s *WatchlistService) GetAvailableCoins(ctx context.Context, search string, limit int) ([]Coin, error) {
	var query string
	var args []interface{}

	if search != "" {
		search = "%" + strings.ToUpper(search) + "%"
		query = `
			SELECT id, symbol, name, binance_symbol, rank_by_market_cap,
			       current_price, market_cap, volume_24h, price_change_24h_pct
			FROM coins
			WHERE is_stablecoin = false
			  AND (UPPER(symbol) LIKE $1 OR UPPER(name) LIKE $1)
			ORDER BY rank_by_market_cap ASC NULLS LAST
			LIMIT $2
		`
		args = []interface{}{search, limit}
	} else {
		query = `
			SELECT id, symbol, name, binance_symbol, rank_by_market_cap,
			       current_price, market_cap, volume_24h, price_change_24h_pct
			FROM coins
			WHERE is_stablecoin = false AND rank_by_market_cap IS NOT NULL
			ORDER BY rank_by_market_cap ASC
			LIMIT $1
		`
		args = []interface{}{limit}
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrDatabase)
	}
	defer rows.Close()

	var coins []Coin
	for rows.Next() {
		var coin Coin
		err := rows.Scan(
			&coin.ID, &coin.Symbol, &coin.Name, &coin.BinanceSymbol, &coin.Rank,
			&coin.CurrentPrice, &coin.MarketCap, &coin.Volume24h, &coin.PriceChange24hPct,
		)
		if err != nil {
			return nil, errors.Wrap(err, errors.ErrDatabase)
		}
		coins = append(coins, coin)
	}

	if coins == nil {
		coins = []Coin{}
	}

	return coins, nil
}

// GetCoinsBySymbols returns coins by their symbols with price data
func (s *WatchlistService) GetCoinsBySymbols(ctx context.Context, symbols []string, limit int) ([]Coin, error) {
	if len(symbols) == 0 {
		return []Coin{}, nil
	}

	// Build placeholders for IN clause
	placeholders := make([]string, len(symbols))
	args := make([]interface{}, len(symbols)+1)
	for i, sym := range symbols {
		placeholders[i] = "$" + strconv.Itoa(i+1)
		args[i] = strings.ToUpper(sym)
	}
	args[len(symbols)] = limit

	query := `
		SELECT id, symbol, name, binance_symbol, rank_by_market_cap,
		       current_price, market_cap, volume_24h, price_change_24h_pct
		FROM coins
		WHERE is_stablecoin = false
		  AND UPPER(symbol) IN (` + strings.Join(placeholders, ", ") + `)
		ORDER BY market_cap DESC NULLS LAST
		LIMIT $` + strconv.Itoa(len(symbols)+1) + `
	`

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrDatabase)
	}
	defer rows.Close()

	var coins []Coin
	for rows.Next() {
		var coin Coin
		err := rows.Scan(
			&coin.ID, &coin.Symbol, &coin.Name, &coin.BinanceSymbol, &coin.Rank,
			&coin.CurrentPrice, &coin.MarketCap, &coin.Volume24h, &coin.PriceChange24hPct,
		)
		if err != nil {
			return nil, errors.Wrap(err, errors.ErrDatabase)
		}
		coins = append(coins, coin)
	}

	if coins == nil {
		coins = []Coin{}
	}

	return coins, nil
}

// CleanupOrphanedEntries removes watchlist and alert entries referencing non-existent coins
func (s *WatchlistService) CleanupOrphanedEntries(ctx context.Context, userID int64) error {
	// Delete alerts referencing non-existent coins
	_, err := s.pool.Exec(ctx, `
		DELETE FROM alerts
		WHERE user_id = $1 AND NOT EXISTS (SELECT 1 FROM coins WHERE id = alerts.coin_id)
	`, userID)
	if err != nil {
		return errors.Wrap(err, errors.ErrDatabase)
	}

	// Delete watchlist entries referencing non-existent coins
	_, err = s.pool.Exec(ctx, `
		DELETE FROM watchlist
		WHERE user_id = $1 AND NOT EXISTS (SELECT 1 FROM coins WHERE id = watchlist.coin_id)
	`, userID)
	if err != nil {
		return errors.Wrap(err, errors.ErrDatabase)
	}

	return nil
}

// DeleteAllByUser deletes all watchlist items for a user
func (s *WatchlistService) DeleteAllByUser(ctx context.Context, userID int64) (int64, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, errors.Wrap(err, errors.ErrDatabase)
	}
	defer tx.Rollback(ctx)

	// Delete all alerts first
	_, err = tx.Exec(ctx, `DELETE FROM alerts WHERE user_id = $1`, userID)
	if err != nil {
		return 0, errors.Wrap(err, errors.ErrDatabase)
	}

	// Delete watchlist
	result, err := tx.Exec(ctx, `DELETE FROM watchlist WHERE user_id = $1`, userID)
	if err != nil {
		return 0, errors.Wrap(err, errors.ErrDatabase)
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, errors.Wrap(err, errors.ErrDatabase)
	}

	return result.RowsAffected(), nil
}
