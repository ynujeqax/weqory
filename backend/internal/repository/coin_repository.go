package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/weqory/backend/pkg/errors"
)

// Coin represents a cryptocurrency
type Coin struct {
	ID            int64
	Symbol        string
	Name          string
	LogoURL       *string
	CurrentPrice  *float64
	PriceChange1h *float64
	PriceChange24h *float64
	PriceChange7d  *float64
	MarketCap     *float64
	Volume24h     *float64
	Rank          *int
	BinanceSymbol *string
	IsActive      bool
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// CoinRepository handles coin database operations
type CoinRepository struct {
	pool *pgxpool.Pool
}

// NewCoinRepository creates a new CoinRepository
func NewCoinRepository(pool *pgxpool.Pool) *CoinRepository {
	return &CoinRepository{pool: pool}
}

// GetBySymbol retrieves a coin by symbol
func (r *CoinRepository) GetBySymbol(ctx context.Context, symbol string) (*Coin, error) {
	query := `
		SELECT id, symbol, name, logo_url, current_price, price_change_1h, price_change_24h,
		       price_change_7d, market_cap, volume_24h, rank, binance_symbol, is_active, created_at, updated_at
		FROM coins WHERE symbol = $1 AND is_active = true
	`
	var coin Coin
	err := r.pool.QueryRow(ctx, query, symbol).Scan(
		&coin.ID, &coin.Symbol, &coin.Name, &coin.LogoURL, &coin.CurrentPrice,
		&coin.PriceChange1h, &coin.PriceChange24h, &coin.PriceChange7d,
		&coin.MarketCap, &coin.Volume24h, &coin.Rank, &coin.BinanceSymbol,
		&coin.IsActive, &coin.CreatedAt, &coin.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.ErrCoinNotFound
		}
		return nil, err
	}
	return &coin, nil
}

// GetByID retrieves a coin by ID
func (r *CoinRepository) GetByID(ctx context.Context, id int64) (*Coin, error) {
	query := `
		SELECT id, symbol, name, logo_url, current_price, price_change_1h, price_change_24h,
		       price_change_7d, market_cap, volume_24h, rank, binance_symbol, is_active, created_at, updated_at
		FROM coins WHERE id = $1
	`
	var coin Coin
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&coin.ID, &coin.Symbol, &coin.Name, &coin.LogoURL, &coin.CurrentPrice,
		&coin.PriceChange1h, &coin.PriceChange24h, &coin.PriceChange7d,
		&coin.MarketCap, &coin.Volume24h, &coin.Rank, &coin.BinanceSymbol,
		&coin.IsActive, &coin.CreatedAt, &coin.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.ErrCoinNotFound
		}
		return nil, err
	}
	return &coin, nil
}

// Search searches for coins by name or symbol
func (r *CoinRepository) Search(ctx context.Context, query string, limit int) ([]Coin, error) {
	sqlQuery := `
		SELECT id, symbol, name, logo_url, current_price, price_change_1h, price_change_24h,
		       price_change_7d, market_cap, volume_24h, rank, binance_symbol, is_active, created_at, updated_at
		FROM coins
		WHERE is_active = true
		  AND (symbol ILIKE $1 OR name ILIKE $1)
		ORDER BY rank ASC NULLS LAST, market_cap DESC NULLS LAST
		LIMIT $2
	`
	searchPattern := query + "%"
	rows, err := r.pool.Query(ctx, sqlQuery, searchPattern, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var coins []Coin
	for rows.Next() {
		var coin Coin
		err := rows.Scan(
			&coin.ID, &coin.Symbol, &coin.Name, &coin.LogoURL, &coin.CurrentPrice,
			&coin.PriceChange1h, &coin.PriceChange24h, &coin.PriceChange7d,
			&coin.MarketCap, &coin.Volume24h, &coin.Rank, &coin.BinanceSymbol,
			&coin.IsActive, &coin.CreatedAt, &coin.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		coins = append(coins, coin)
	}
	return coins, nil
}

// GetTop retrieves top coins by market cap
func (r *CoinRepository) GetTop(ctx context.Context, limit int) ([]Coin, error) {
	query := `
		SELECT id, symbol, name, logo_url, current_price, price_change_1h, price_change_24h,
		       price_change_7d, market_cap, volume_24h, rank, binance_symbol, is_active, created_at, updated_at
		FROM coins
		WHERE is_active = true
		ORDER BY rank ASC NULLS LAST, market_cap DESC NULLS LAST
		LIMIT $1
	`
	rows, err := r.pool.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var coins []Coin
	for rows.Next() {
		var coin Coin
		err := rows.Scan(
			&coin.ID, &coin.Symbol, &coin.Name, &coin.LogoURL, &coin.CurrentPrice,
			&coin.PriceChange1h, &coin.PriceChange24h, &coin.PriceChange7d,
			&coin.MarketCap, &coin.Volume24h, &coin.Rank, &coin.BinanceSymbol,
			&coin.IsActive, &coin.CreatedAt, &coin.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		coins = append(coins, coin)
	}
	return coins, nil
}

// UpdatePrice updates coin price data
func (r *CoinRepository) UpdatePrice(ctx context.Context, symbol string, price, change24h, volume24h float64) error {
	query := `
		UPDATE coins
		SET current_price = $2, price_change_24h = $3, volume_24h = $4, updated_at = NOW()
		WHERE symbol = $1
	`
	_, err := r.pool.Exec(ctx, query, symbol, price, change24h, volume24h)
	return err
}
