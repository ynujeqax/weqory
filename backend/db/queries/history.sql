-- name: GetHistoryByUserID :many
SELECT
    h.id, h.user_id, h.alert_id, h.coin_id,
    h.alert_type, h.condition_operator, h.condition_value, h.condition_timeframe,
    h.triggered_price, h.triggered_at,
    h.notification_sent, h.notification_error,
    c.symbol, c.name, c.binance_symbol
FROM alert_history h
JOIN coins c ON c.id = h.coin_id
WHERE h.user_id = $1
ORDER BY h.triggered_at DESC
LIMIT $2 OFFSET $3;

-- name: CountHistoryByUser :one
SELECT COUNT(*) FROM alert_history WHERE user_id = $1;

-- name: DeleteHistoryByUser :execrows
DELETE FROM alert_history WHERE user_id = $1;

-- name: DeleteOldHistoryByUser :execrows
-- Deletes history older than the user's retention period
DELETE FROM alert_history
WHERE user_id = $1
  AND triggered_at < NOW() - ($2 || ' days')::INTERVAL;

-- name: CleanupHistoryByRetention :execrows
-- Cleans up old history for all users based on their plan's retention
WITH user_retention AS (
    SELECT u.id as user_id, sp.history_retention_days
    FROM users u
    JOIN subscription_plans sp ON sp.name = u.plan
)
DELETE FROM alert_history h
USING user_retention ur
WHERE h.user_id = ur.user_id
  AND h.triggered_at < NOW() - (ur.history_retention_days || ' days')::INTERVAL;

-- name: GetHistoryStats :one
SELECT
    COUNT(*) as total_count,
    MIN(triggered_at) as oldest_record,
    MAX(triggered_at) as newest_record
FROM alert_history
WHERE user_id = $1;
