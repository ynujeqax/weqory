-- name: GetWatchlistItem :one
SELECT w.*, c.symbol, c.name, c.binance_symbol, c.current_price,
       c.price_change_24h_pct, c.volume_24h, c.market_cap
FROM watchlist w
JOIN coins c ON c.id = w.coin_id
WHERE w.id = $1;

-- name: GetWatchlistByUserID :many
SELECT
    w.id,
    w.user_id,
    w.coin_id,
    w.created_at,
    c.symbol,
    c.name,
    c.binance_symbol,
    c.current_price,
    c.price_change_24h_pct,
    c.volume_24h,
    c.market_cap,
    c.rank_by_market_cap,
    (SELECT COUNT(*) FROM alerts a WHERE a.user_id = w.user_id AND a.coin_id = w.coin_id) as alerts_count
FROM watchlist w
JOIN coins c ON c.id = w.coin_id
WHERE w.user_id = $1
ORDER BY w.created_at DESC;

-- name: GetWatchlistByUserAndCoin :one
SELECT * FROM watchlist WHERE user_id = $1 AND coin_id = $2;

-- name: CountWatchlistByUser :one
SELECT COUNT(*) FROM watchlist WHERE user_id = $1;

-- name: CreateWatchlistItem :one
INSERT INTO watchlist (user_id, coin_id)
VALUES ($1, $2)
RETURNING *;

-- name: DeleteWatchlistItem :exec
DELETE FROM watchlist WHERE id = $1;

-- name: DeleteWatchlistByUserAndCoin :execrows
DELETE FROM watchlist WHERE user_id = $1 AND coin_id = $2;

-- name: DeleteAllWatchlistByUser :execrows
DELETE FROM watchlist WHERE user_id = $1;

-- name: GetWatchlistBinanceSymbols :many
SELECT DISTINCT c.binance_symbol
FROM watchlist w
JOIN coins c ON c.id = w.coin_id
WHERE w.user_id = $1;
