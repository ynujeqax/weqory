package service

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/weqory/backend/internal/telegram"
	"github.com/weqory/backend/pkg/errors"
)

// PaymentService handles payment-related business logic
type PaymentService struct {
	pool        *pgxpool.Pool
	telegramBot *telegram.Client
	logger      *slog.Logger
}

// NewPaymentService creates a new PaymentService
func NewPaymentService(pool *pgxpool.Pool, telegramBot *telegram.Client, logger *slog.Logger) *PaymentService {
	return &PaymentService{
		pool:        pool,
		telegramBot: telegramBot,
		logger:      logger,
	}
}

// Plan represents a subscription plan
type Plan struct {
	ID                   int    `json:"id"`
	Name                 string `json:"name"`
	MaxCoins             int    `json:"max_coins"`
	MaxAlerts            int    `json:"max_alerts"`
	MaxNotifications     *int   `json:"max_notifications"`
	HistoryRetentionDays int    `json:"history_retention_days"`
	PriceMonthly         *int   `json:"price_monthly"`
	PriceYearly          *int   `json:"price_yearly"`
}

// Payment represents a payment record
type Payment struct {
	ID                int64      `json:"id"`
	UserID            int64      `json:"user_id"`
	TelegramPaymentID *string    `json:"telegram_payment_id"`
	Plan              string     `json:"plan"`
	Period            string     `json:"period"`
	StarsAmount       int        `json:"stars_amount"`
	Status            string     `json:"status"`
	CreatedAt         time.Time  `json:"created_at"`
	CompletedAt       *time.Time `json:"completed_at"`
}

// InvoicePayload contains information encoded in invoice payload
type InvoicePayload struct {
	UserID    int64  `json:"user_id"`
	Plan      string `json:"plan"`
	Period    string `json:"period"`
	PaymentID int64  `json:"payment_id"`
}

// CreateInvoiceRequest represents a request to create an invoice
type CreateInvoiceRequest struct {
	Plan   string `json:"plan"`
	Period string `json:"period"`
}

// CreateInvoiceResponse represents the response with invoice link
type CreateInvoiceResponse struct {
	InvoiceLink string `json:"invoice_link"`
	PaymentID   int64  `json:"payment_id"`
}

// GetAllPlans retrieves all subscription plans
func (s *PaymentService) GetAllPlans(ctx context.Context) ([]Plan, error) {
	query := `
		SELECT id, name, max_coins, max_alerts, max_notifications,
		       history_retention_days, price_monthly, price_yearly
		FROM subscription_plans
		ORDER BY max_coins ASC
	`

	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrDatabase)
	}
	defer rows.Close()

	var plans []Plan
	for rows.Next() {
		var plan Plan
		if err := rows.Scan(
			&plan.ID, &plan.Name, &plan.MaxCoins, &plan.MaxAlerts,
			&plan.MaxNotifications, &plan.HistoryRetentionDays,
			&plan.PriceMonthly, &plan.PriceYearly,
		); err != nil {
			return nil, errors.Wrap(err, errors.ErrDatabase)
		}
		plans = append(plans, plan)
	}

	return plans, nil
}

// GetPlanByName retrieves a plan by name
func (s *PaymentService) GetPlanByName(ctx context.Context, name string) (*Plan, error) {
	query := `
		SELECT id, name, max_coins, max_alerts, max_notifications,
		       history_retention_days, price_monthly, price_yearly
		FROM subscription_plans
		WHERE name = $1
	`

	var plan Plan
	err := s.pool.QueryRow(ctx, query, name).Scan(
		&plan.ID, &plan.Name, &plan.MaxCoins, &plan.MaxAlerts,
		&plan.MaxNotifications, &plan.HistoryRetentionDays,
		&plan.PriceMonthly, &plan.PriceYearly,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.ErrPlanNotFound
		}
		return nil, errors.Wrap(err, errors.ErrDatabase)
	}

	return &plan, nil
}

// CreateInvoice creates a payment record and returns invoice link
func (s *PaymentService) CreateInvoice(ctx context.Context, userID int64, req CreateInvoiceRequest) (*CreateInvoiceResponse, error) {
	// Validate plan
	plan, err := s.GetPlanByName(ctx, req.Plan)
	if err != nil {
		return nil, err
	}

	// Plan must be paid (not standard)
	if plan.PriceMonthly == nil {
		return nil, errors.ErrBadRequest.WithMessage("cannot purchase free plan")
	}

	// Validate period
	if req.Period != "monthly" && req.Period != "yearly" {
		return nil, errors.ErrBadRequest.WithMessage("period must be 'monthly' or 'yearly'")
	}

	// Calculate stars amount
	var starsAmount int
	if req.Period == "yearly" {
		if plan.PriceYearly == nil {
			return nil, errors.ErrBadRequest.WithMessage("yearly plan not available")
		}
		starsAmount = *plan.PriceYearly
	} else {
		starsAmount = *plan.PriceMonthly
	}

	// Create pending payment record
	var paymentID int64
	err = s.pool.QueryRow(ctx, `
		INSERT INTO payments (user_id, plan, period, stars_amount, status)
		VALUES ($1, $2, $3, $4, 'pending')
		RETURNING id
	`, userID, req.Plan, req.Period, starsAmount).Scan(&paymentID)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrDatabase)
	}

	// Create payload for invoice
	payload := InvoicePayload{
		UserID:    userID,
		Plan:      req.Plan,
		Period:    req.Period,
		PaymentID: paymentID,
	}
	payloadBytes, _ := json.Marshal(payload)

	// Create invoice link using Telegram API
	invoiceLink, err := s.telegramBot.CreateSubscriptionInvoiceLink(
		ctx,
		req.Plan,
		req.Period,
		starsAmount,
		string(payloadBytes),
	)
	if err != nil {
		// Mark payment as failed
		s.pool.Exec(ctx, `UPDATE payments SET status = 'failed' WHERE id = $1`, paymentID)
		return nil, errors.Wrap(err, errors.ErrExternalService)
	}

	s.logger.Info("created invoice",
		slog.Int64("user_id", userID),
		slog.Int64("payment_id", paymentID),
		slog.String("plan", req.Plan),
		slog.String("period", req.Period),
		slog.Int("stars", starsAmount),
	)

	return &CreateInvoiceResponse{
		InvoiceLink: invoiceLink,
		PaymentID:   paymentID,
	}, nil
}

// HandleSuccessfulPayment processes a successful payment from Telegram webhook
func (s *PaymentService) HandleSuccessfulPayment(ctx context.Context, payment *telegram.SuccessfulPayment) error {
	// Parse payload
	var payload InvoicePayload
	if err := json.Unmarshal([]byte(payment.InvoicePayload), &payload); err != nil {
		s.logger.Error("failed to parse payment payload",
			slog.String("payload", payment.InvoicePayload),
			slog.String("error", err.Error()),
		)
		return errors.ErrBadRequest.WithMessage("invalid payment payload")
	}

	// Check for duplicate payment (idempotency)
	var existingStatus string
	err := s.pool.QueryRow(ctx, `
		SELECT status FROM payments WHERE telegram_payment_id = $1
	`, payment.TelegramPaymentChargeID).Scan(&existingStatus)
	if err == nil {
		// Payment already exists
		if existingStatus == "completed" {
			s.logger.Info("duplicate payment webhook, already processed",
				slog.String("charge_id", payment.TelegramPaymentChargeID),
			)
			return nil // Already processed successfully
		}
		s.logger.Warn("duplicate payment with non-completed status",
			slog.String("charge_id", payment.TelegramPaymentChargeID),
			slog.String("status", existingStatus),
		)
	}

	// Begin transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return errors.Wrap(err, errors.ErrDatabase)
	}
	defer tx.Rollback(ctx)

	// Update payment status - use row locking to prevent race conditions
	result, err := tx.Exec(ctx, `
		UPDATE payments SET
			status = 'completed',
			telegram_payment_id = $2,
			completed_at = NOW()
		WHERE id = $1 AND status = 'pending'
	`, payload.PaymentID, payment.TelegramPaymentChargeID)
	if err != nil {
		return errors.Wrap(err, errors.ErrDatabase)
	}

	// Check if the update affected any rows
	if result.RowsAffected() == 0 {
		// Payment was already processed or doesn't exist
		s.logger.Warn("payment not found or already processed",
			slog.Int64("payment_id", payload.PaymentID),
			slog.String("charge_id", payment.TelegramPaymentChargeID),
		)
		return nil // Return nil since this is idempotent
	}

	// Calculate expiration date
	var expiresAt time.Time
	if payload.Period == "yearly" {
		expiresAt = time.Now().AddDate(1, 0, 0) // 1 year
	} else {
		expiresAt = time.Now().AddDate(0, 1, 0) // 1 month
	}

	// Activate subscription
	_, err = tx.Exec(ctx, `
		UPDATE users SET
			plan = $2,
			plan_expires_at = $3,
			plan_period = $4,
			updated_at = NOW()
		WHERE id = $1
	`, payload.UserID, payload.Plan, expiresAt, payload.Period)
	if err != nil {
		return errors.Wrap(err, errors.ErrDatabase)
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return errors.Wrap(err, errors.ErrDatabase)
	}

	s.logger.Info("activated subscription",
		slog.Int64("user_id", payload.UserID),
		slog.String("plan", payload.Plan),
		slog.String("period", payload.Period),
		slog.Time("expires_at", expiresAt),
	)

	return nil
}

// HandlePreCheckoutQuery responds to a pre-checkout query
func (s *PaymentService) HandlePreCheckoutQuery(ctx context.Context, query *telegram.PreCheckoutQuery) error {
	// Parse payload to validate
	var payload InvoicePayload
	if err := json.Unmarshal([]byte(query.InvoicePayload), &payload); err != nil {
		s.logger.Error("invalid pre-checkout payload",
			slog.String("payload", query.InvoicePayload),
		)
		return s.telegramBot.AnswerPreCheckoutQuery(ctx, telegram.AnswerPreCheckoutQueryRequest{
			PreCheckoutQueryID: query.ID,
			OK:                 false,
			ErrorMessage:       "Invalid payment data",
		})
	}

	// Verify payment exists and is pending
	var status string
	err := s.pool.QueryRow(ctx, `
		SELECT status FROM payments WHERE id = $1 AND user_id = $2
	`, payload.PaymentID, payload.UserID).Scan(&status)
	if err != nil || status != "pending" {
		return s.telegramBot.AnswerPreCheckoutQuery(ctx, telegram.AnswerPreCheckoutQueryRequest{
			PreCheckoutQueryID: query.ID,
			OK:                 false,
			ErrorMessage:       "Payment session expired",
		})
	}

	// Approve the checkout
	return s.telegramBot.AnswerPreCheckoutQuery(ctx, telegram.AnswerPreCheckoutQueryRequest{
		PreCheckoutQueryID: query.ID,
		OK:                 true,
	})
}

// GetPaymentHistory retrieves payment history for a user
func (s *PaymentService) GetPaymentHistory(ctx context.Context, userID int64, limit, offset int) ([]Payment, error) {
	query := `
		SELECT id, user_id, telegram_payment_id, plan, period,
		       stars_amount, status, created_at, completed_at
		FROM payments
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := s.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrDatabase)
	}
	defer rows.Close()

	var payments []Payment
	for rows.Next() {
		var p Payment
		if err := rows.Scan(
			&p.ID, &p.UserID, &p.TelegramPaymentID, &p.Plan, &p.Period,
			&p.StarsAmount, &p.Status, &p.CreatedAt, &p.CompletedAt,
		); err != nil {
			return nil, errors.Wrap(err, errors.ErrDatabase)
		}
		payments = append(payments, p)
	}

	return payments, nil
}

// GetPaymentByID retrieves a payment by ID
func (s *PaymentService) GetPaymentByID(ctx context.Context, paymentID int64) (*Payment, error) {
	query := `
		SELECT id, user_id, telegram_payment_id, plan, period,
		       stars_amount, status, created_at, completed_at
		FROM payments
		WHERE id = $1
	`

	var p Payment
	err := s.pool.QueryRow(ctx, query, paymentID).Scan(
		&p.ID, &p.UserID, &p.TelegramPaymentID, &p.Plan, &p.Period,
		&p.StarsAmount, &p.Status, &p.CreatedAt, &p.CompletedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.ErrNotFound
		}
		return nil, errors.Wrap(err, errors.ErrDatabase)
	}

	return &p, nil
}

// RefundPayment refunds a payment (Stars refund via Telegram)
func (s *PaymentService) RefundPayment(ctx context.Context, paymentID int64) error {
	payment, err := s.GetPaymentByID(ctx, paymentID)
	if err != nil {
		return err
	}

	if payment.Status != "completed" {
		return errors.ErrBadRequest.WithMessage("can only refund completed payments")
	}

	// TODO: Call Telegram API to refund stars
	// For now, just mark as refunded and downgrade user

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return errors.Wrap(err, errors.ErrDatabase)
	}
	defer tx.Rollback(ctx)

	// Mark payment as refunded
	_, err = tx.Exec(ctx, `UPDATE payments SET status = 'refunded' WHERE id = $1`, paymentID)
	if err != nil {
		return errors.Wrap(err, errors.ErrDatabase)
	}

	// Downgrade user to standard
	_, err = tx.Exec(ctx, `
		UPDATE users SET
			plan = 'standard',
			plan_expires_at = NULL,
			plan_period = NULL,
			updated_at = NOW()
		WHERE id = $1
	`, payment.UserID)
	if err != nil {
		return errors.Wrap(err, errors.ErrDatabase)
	}

	if err := tx.Commit(ctx); err != nil {
		return errors.Wrap(err, errors.ErrDatabase)
	}

	s.logger.Info("refunded payment",
		slog.Int64("payment_id", paymentID),
		slog.Int64("user_id", payment.UserID),
	)

	return nil
}
