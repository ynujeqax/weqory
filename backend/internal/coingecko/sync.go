package coingecko

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// SyncService handles synchronization of coin data from CoinGecko
type SyncService struct {
	client *Client
	pool   *pgxpool.Pool
	logger *slog.Logger
}

// NewSyncService creates a new sync service
func NewSyncService(client *Client, pool *pgxpool.Pool, logger *slog.Logger) *SyncService {
	return &SyncService{
		client: client,
		pool:   pool,
		logger: logger,
	}
}

// SyncCoins fetches and updates coin data from CoinGecko
// numCoins: number of top coins to sync (max 250 per page)
func (s *SyncService) SyncCoins(ctx context.Context, numCoins int) error {
	s.logger.Info("starting coin sync", slog.Int("num_coins", numCoins))

	perPage := 250
	if numCoins < perPage {
		perPage = numCoins
	}

	pages := (numCoins + perPage - 1) / perPage
	var allCoins []CoinMarket

	for page := 1; page <= pages; page++ {
		s.logger.Info("fetching page", slog.Int("page", page), slog.Int("per_page", perPage))

		coins, err := s.client.GetCoinsMarkets(ctx, "usd", perPage, page)
		if err != nil {
			return fmt.Errorf("fetch page %d: %w", page, err)
		}

		allCoins = append(allCoins, coins...)

		// Respect rate limits - wait between requests
		if page < pages {
			time.Sleep(1500 * time.Millisecond)
		}
	}

	s.logger.Info("fetched coins from CoinGecko", slog.Int("count", len(allCoins)))

	// Update database
	if err := s.upsertCoins(ctx, allCoins); err != nil {
		return fmt.Errorf("upsert coins: %w", err)
	}

	s.logger.Info("coin sync completed", slog.Int("synced", len(allCoins)))
	return nil
}

// upsertCoins inserts or updates coins in the database
func (s *SyncService) upsertCoins(ctx context.Context, coins []CoinMarket) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	for _, coin := range coins {
		symbol := strings.ToUpper(coin.Symbol)
		binanceSymbol := GetBinanceSymbol(coin.Symbol)
		isStablecoin := IsStablecoin(coin.Symbol)

		_, err := tx.Exec(ctx, `
			INSERT INTO coins (
				symbol, name, binance_symbol, is_stablecoin, rank_by_market_cap,
				current_price, market_cap, volume_24h, price_change_24h_pct, last_updated
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
			ON CONFLICT (symbol) DO UPDATE SET
				name = EXCLUDED.name,
				binance_symbol = EXCLUDED.binance_symbol,
				is_stablecoin = EXCLUDED.is_stablecoin,
				rank_by_market_cap = EXCLUDED.rank_by_market_cap,
				current_price = EXCLUDED.current_price,
				market_cap = EXCLUDED.market_cap,
				volume_24h = EXCLUDED.volume_24h,
				price_change_24h_pct = EXCLUDED.price_change_24h_pct,
				last_updated = NOW()
		`,
			symbol,
			coin.Name,
			binanceSymbol,
			isStablecoin,
			coin.MarketCapRank,
			coin.CurrentPrice,
			coin.MarketCap,
			coin.TotalVolume,
			coin.PriceChangePercentage24h,
		)
		if err != nil {
			s.logger.Warn("failed to upsert coin",
				slog.String("symbol", symbol),
				slog.String("error", err.Error()),
			)
			continue
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	return nil
}

// StartPeriodicSync starts a goroutine that syncs coins periodically
func (s *SyncService) StartPeriodicSync(ctx context.Context, numCoins int, interval time.Duration) {
	// Initial sync
	go func() {
		if err := s.SyncCoins(ctx, numCoins); err != nil {
			s.logger.Error("initial coin sync failed", slog.String("error", err.Error()))
		}
	}()

	// Periodic sync
	ticker := time.NewTicker(interval)
	go func() {
		for {
			select {
			case <-ctx.Done():
				ticker.Stop()
				return
			case <-ticker.C:
				if err := s.SyncCoins(ctx, numCoins); err != nil {
					s.logger.Error("periodic coin sync failed", slog.String("error", err.Error()))
				}
			}
		}
	}()

	s.logger.Info("started periodic coin sync",
		slog.Int("num_coins", numCoins),
		slog.Duration("interval", interval),
	)
}
