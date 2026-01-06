-- name: GetAlertHistoryByID :one
SELECT h.*, c.symbol, c.name
FROM alert_history h
JOIN coins c ON c.id = h.coin_id
WHERE h.id = $1;

-- name: GetAlertHistoryByUser :many
SELECT
    h.*,
    c.symbol,
    c.name,
    c.binance_symbol
FROM alert_history h
JOIN coins c ON c.id = h.coin_id
WHERE h.user_id = $1
ORDER BY h.triggered_at DESC
LIMIT $2 OFFSET $3;

-- name: GetAlertHistoryByUserAndCoin :many
SELECT
    h.*,
    c.symbol,
    c.name
FROM alert_history h
JOIN coins c ON c.id = h.coin_id
WHERE h.user_id = $1 AND h.coin_id = $2
ORDER BY h.triggered_at DESC
LIMIT $3 OFFSET $4;

-- name: CountAlertHistoryByUser :one
SELECT COUNT(*) FROM alert_history WHERE user_id = $1;

-- name: CreateAlertHistory :one
INSERT INTO alert_history (
    user_id, alert_id, coin_id, alert_type,
    condition_operator, condition_value, condition_timeframe,
    triggered_price, notification_sent, notification_error
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
) RETURNING *;

-- name: UpdateAlertHistoryNotification :exec
UPDATE alert_history SET
    notification_sent = $2,
    notification_error = $3
WHERE id = $1;

-- name: DeleteAlertHistoryByUser :execrows
DELETE FROM alert_history WHERE user_id = $1;

-- name: DeleteOldAlertHistory :execrows
DELETE FROM alert_history
WHERE user_id = $1
  AND triggered_at < NOW() - INTERVAL '1 day' * $2;

-- name: GetRecentAlertHistory :many
SELECT
    h.*,
    c.symbol,
    c.name
FROM alert_history h
JOIN coins c ON c.id = h.coin_id
WHERE h.user_id = $1 AND h.triggered_at > NOW() - INTERVAL '24 hours'
ORDER BY h.triggered_at DESC;
