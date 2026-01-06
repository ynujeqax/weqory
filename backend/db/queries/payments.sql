-- name: GetPaymentByID :one
SELECT * FROM payments WHERE id = $1;

-- name: GetPaymentByTelegramID :one
SELECT * FROM payments WHERE telegram_payment_id = $1;

-- name: GetPaymentsByUser :many
SELECT * FROM payments
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: CreatePayment :one
INSERT INTO payments (
    user_id, telegram_payment_id, plan, period, stars_amount, status
) VALUES (
    $1, $2, $3, $4, $5, $6
) RETURNING *;

-- name: UpdatePaymentStatus :one
UPDATE payments SET
    status = $2,
    completed_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE completed_at END
WHERE id = $1
RETURNING *;

-- name: UpdatePaymentStatusByTelegramID :one
UPDATE payments SET
    status = $2,
    completed_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE completed_at END
WHERE telegram_payment_id = $1
RETURNING *;

-- name: CountPaymentsByUser :one
SELECT COUNT(*) FROM payments WHERE user_id = $1 AND status = 'completed';

-- name: GetLastSuccessfulPayment :one
SELECT * FROM payments
WHERE user_id = $1 AND status = 'completed'
ORDER BY completed_at DESC
LIMIT 1;
