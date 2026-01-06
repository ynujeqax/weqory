-- name: GetAlertByID :one
SELECT a.*, c.symbol, c.name, c.binance_symbol
FROM alerts a
JOIN coins c ON c.id = a.coin_id
WHERE a.id = $1;

-- name: GetAlertsByUserID :many
SELECT
    a.*,
    c.symbol,
    c.name,
    c.binance_symbol,
    c.current_price
FROM alerts a
JOIN coins c ON c.id = a.coin_id
WHERE a.user_id = $1
ORDER BY a.created_at DESC;

-- name: GetAlertsByUserAndCoin :many
SELECT a.*, c.symbol, c.name, c.binance_symbol
FROM alerts a
JOIN coins c ON c.id = a.coin_id
WHERE a.user_id = $1 AND a.coin_id = $2
ORDER BY a.created_at DESC;

-- name: GetActiveAlertsByCoin :many
SELECT a.*, u.telegram_id, u.notifications_enabled
FROM alerts a
JOIN users u ON u.id = a.user_id
WHERE a.coin_id = $1 AND a.is_paused = false
ORDER BY a.created_at DESC;

-- name: GetActiveAlertsByBinanceSymbol :many
SELECT a.*, c.binance_symbol, u.telegram_id, u.notifications_enabled
FROM alerts a
JOIN coins c ON c.id = a.coin_id
JOIN users u ON u.id = a.user_id
WHERE c.binance_symbol = $1 AND a.is_paused = false;

-- name: GetAllActiveAlerts :many
SELECT a.*, c.binance_symbol, c.symbol, u.telegram_id
FROM alerts a
JOIN coins c ON c.id = a.coin_id
JOIN users u ON u.id = a.user_id
WHERE a.is_paused = false;

-- name: CountAlertsByUser :one
SELECT COUNT(*) FROM alerts WHERE user_id = $1;

-- name: CountActiveAlertsByUser :one
SELECT COUNT(*) FROM alerts WHERE user_id = $1 AND is_paused = false;

-- name: CreateAlert :one
INSERT INTO alerts (
    user_id, coin_id, alert_type, condition_operator,
    condition_value, condition_timeframe, is_recurring,
    periodic_interval, price_when_created
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
) RETURNING *;

-- name: UpdateAlertPaused :one
UPDATE alerts SET is_paused = $2 WHERE id = $1 RETURNING *;

-- name: UpdateAlertTriggered :exec
UPDATE alerts SET
    times_triggered = times_triggered + 1,
    last_triggered_at = NOW()
WHERE id = $1;

-- name: DeleteAlert :exec
DELETE FROM alerts WHERE id = $1;

-- name: DeleteAlertsByUser :execrows
DELETE FROM alerts WHERE user_id = $1;

-- name: DeleteAlertsByUserAndCoin :execrows
DELETE FROM alerts WHERE user_id = $1 AND coin_id = $2;

-- name: GetAlertOwner :one
SELECT user_id FROM alerts WHERE id = $1;
