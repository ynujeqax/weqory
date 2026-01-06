-- name: GetCoinByID :one
SELECT * FROM coins WHERE id = $1;

-- name: GetCoinBySymbol :one
SELECT * FROM coins WHERE symbol = $1;

-- name: GetCoinByBinanceSymbol :one
SELECT * FROM coins WHERE binance_symbol = $1;

-- name: ListCoins :many
SELECT * FROM coins
WHERE is_stablecoin = false
ORDER BY rank_by_market_cap ASC NULLS LAST
LIMIT $1 OFFSET $2;

-- name: ListCoinsByRank :many
SELECT * FROM coins
WHERE is_stablecoin = false AND rank_by_market_cap IS NOT NULL
ORDER BY rank_by_market_cap ASC
LIMIT $1;

-- name: SearchCoins :many
SELECT * FROM coins
WHERE is_stablecoin = false
  AND (
    symbol ILIKE '%' || $1 || '%'
    OR name ILIKE '%' || $1 || '%'
  )
ORDER BY rank_by_market_cap ASC NULLS LAST
LIMIT $2;

-- name: UpdateCoinPrice :exec
UPDATE coins SET
    current_price = $2,
    market_cap = $3,
    volume_24h = $4,
    price_change_24h_pct = $5,
    last_updated = NOW()
WHERE id = $1;

-- name: UpdateCoinPriceBySymbol :exec
UPDATE coins SET
    current_price = $2,
    market_cap = $3,
    volume_24h = $4,
    price_change_24h_pct = $5,
    last_updated = NOW()
WHERE binance_symbol = $1;

-- name: GetAllBinanceSymbols :many
SELECT binance_symbol FROM coins WHERE is_stablecoin = false;
