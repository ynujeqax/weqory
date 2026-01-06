-- name: GetPlanByName :one
SELECT * FROM subscription_plans WHERE name = $1;

-- name: GetAllPlans :many
SELECT * FROM subscription_plans ORDER BY max_coins ASC;

-- name: GetPlanLimits :one
SELECT max_coins, max_alerts, max_notifications, history_retention_days
FROM subscription_plans WHERE name = $1;
