-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByTelegramID :one
SELECT * FROM users WHERE telegram_id = $1;

-- name: CreateUser :one
INSERT INTO users (
    telegram_id, username, first_name, last_name, language_code
) VALUES (
    $1, $2, $3, $4, $5
) RETURNING *;

-- name: UpdateUser :one
UPDATE users SET
    username = COALESCE(sqlc.narg('username'), username),
    first_name = COALESCE(sqlc.narg('first_name'), first_name),
    last_name = COALESCE(sqlc.narg('last_name'), last_name),
    language_code = COALESCE(sqlc.narg('language_code'), language_code),
    last_active_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateUserPlan :one
UPDATE users SET
    plan = $2,
    plan_expires_at = $3,
    plan_period = $4
WHERE id = $1
RETURNING *;

-- name: UpdateUserSettings :one
UPDATE users SET
    notifications_enabled = COALESCE(sqlc.narg('notifications_enabled'), notifications_enabled),
    vibration_enabled = COALESCE(sqlc.narg('vibration_enabled'), vibration_enabled)
WHERE id = $1
RETURNING *;

-- name: IncrementNotificationsUsed :exec
UPDATE users SET
    notifications_used = notifications_used + 1
WHERE id = $1;

-- name: ResetNotificationsUsed :exec
UPDATE users SET
    notifications_used = 0,
    notifications_reset_at = NOW()
WHERE id = $1;

-- name: UpdateLastActive :exec
UPDATE users SET last_active_at = NOW() WHERE id = $1;

-- name: GetUserWithLimits :one
SELECT
    u.*,
    sp.max_coins,
    sp.max_alerts,
    sp.max_notifications,
    sp.history_retention_days,
    (SELECT COUNT(*) FROM watchlist WHERE user_id = u.id) as coins_used,
    (SELECT COUNT(*) FROM alerts WHERE user_id = u.id) as alerts_used
FROM users u
JOIN subscription_plans sp ON sp.name = u.plan
WHERE u.id = $1;

-- name: DowngradePlanToStandard :one
UPDATE users SET
    plan = 'standard',
    plan_expires_at = NULL,
    plan_period = NULL,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: GetExpiredPlans :many
SELECT id, telegram_id, plan, plan_expires_at
FROM users
WHERE plan != 'standard'
  AND plan_expires_at IS NOT NULL
  AND plan_expires_at < NOW();

-- name: GetUsersNearExpiration :many
SELECT id, telegram_id, plan, plan_expires_at
FROM users
WHERE plan != 'standard'
  AND plan_expires_at IS NOT NULL
  AND plan_expires_at > NOW()
  AND plan_expires_at < NOW() + INTERVAL '7 days';

-- name: ResetMonthlyNotifications :exec
UPDATE users SET
    notifications_used = 0,
    notifications_reset_at = NOW()
WHERE notifications_reset_at < DATE_TRUNC('month', NOW())
   OR notifications_reset_at IS NULL;
