package handlers

import (
	"encoding/json"
	"log/slog"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/weqory/backend/internal/api/dto"
	"github.com/weqory/backend/internal/api/middleware"
	"github.com/weqory/backend/internal/service"
	"github.com/weqory/backend/internal/telegram"
	"github.com/weqory/backend/pkg/errors"
	"github.com/weqory/backend/pkg/validator"
)

// PaymentHandler handles payment-related endpoints
type PaymentHandler struct {
	paymentService *service.PaymentService
	validator      *validator.Validator
	logger         *slog.Logger
}

// NewPaymentHandler creates a new PaymentHandler
func NewPaymentHandler(
	paymentService *service.PaymentService,
	validator *validator.Validator,
	logger *slog.Logger,
) *PaymentHandler {
	return &PaymentHandler{
		paymentService: paymentService,
		validator:      validator,
		logger:         logger,
	}
}

// GetPlans handles GET /api/v1/payments/plans
// Returns available subscription plans with pricing
func (h *PaymentHandler) GetPlans(c *fiber.Ctx) error {
	plans, err := h.paymentService.GetAllPlans(c.Context())
	if err != nil {
		return sendError(c, err)
	}

	// Convert to response
	response := make([]dto.SubscriptionPlanResponse, len(plans))
	for i, plan := range plans {
		response[i] = dto.SubscriptionPlanResponse{
			Name:                 plan.Name,
			MaxCoins:             plan.MaxCoins,
			MaxAlerts:            plan.MaxAlerts,
			MaxNotifications:     plan.MaxNotifications,
			HistoryRetentionDays: plan.HistoryRetentionDays,
			PriceMonthly:         plan.PriceMonthly,
			PriceYearly:          plan.PriceYearly,
		}
	}

	return c.JSON(dto.PlansResponse{Plans: response})
}

// CreateInvoice handles POST /api/v1/payments/create-invoice
// Creates a payment invoice for Telegram Stars
func (h *PaymentHandler) CreateInvoice(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return sendError(c, errors.ErrUnauthorized)
	}

	var req dto.CreateInvoiceRequest
	if err := c.BodyParser(&req); err != nil {
		return sendError(c, errors.ErrBadRequest.WithMessage("Invalid request body"))
	}

	if errs := h.validator.Validate(req); errs != nil {
		return sendValidationError(c, errs)
	}

	result, err := h.paymentService.CreateInvoice(c.Context(), userID, service.CreateInvoiceRequest{
		Plan:   req.Plan,
		Period: req.Period,
	})
	if err != nil {
		return sendError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(dto.CreateInvoiceResponse{
		InvoiceLink: result.InvoiceLink,
		PaymentID:   result.PaymentID,
	})
}

// GetPaymentHistory handles GET /api/v1/payments/history
// Returns user's payment history
func (h *PaymentHandler) GetPaymentHistory(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return sendError(c, errors.ErrUnauthorized)
	}

	// Parse pagination
	limit := 20
	offset := 0

	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}
	if o := c.Query("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	payments, err := h.paymentService.GetPaymentHistory(c.Context(), userID, limit, offset)
	if err != nil {
		return sendError(c, err)
	}

	// Convert to response
	items := make([]dto.PaymentResponse, len(payments))
	for i, p := range payments {
		items[i] = dto.PaymentResponse{
			ID:          p.ID,
			Plan:        p.Plan,
			Period:      p.Period,
			StarsAmount: p.StarsAmount,
			Status:      p.Status,
			CreatedAt:   p.CreatedAt,
			CompletedAt: p.CompletedAt,
		}
	}

	return c.JSON(dto.PaymentHistoryResponse{
		Items: items,
		Total: len(items),
	})
}

// HandleWebhook handles POST /api/v1/payments/webhook
// Processes Telegram payment webhooks (pre_checkout_query and successful_payment)
// This endpoint does NOT require authentication - it receives calls from Telegram
func (h *PaymentHandler) HandleWebhook(c *fiber.Ctx) error {
	// Parse the update
	var update telegram.PaymentUpdate
	if err := json.Unmarshal(c.Body(), &update); err != nil {
		h.logger.Error("failed to parse webhook payload",
			slog.String("error", err.Error()),
			slog.String("body", string(c.Body())),
		)
		// Return 400 for malformed payloads - no point retrying
		return c.SendStatus(fiber.StatusBadRequest)
	}

	// Handle pre-checkout query
	if update.PreCheckoutQuery != nil {
		h.logger.Info("received pre-checkout query",
			slog.String("query_id", update.PreCheckoutQuery.ID),
			slog.Int("amount", update.PreCheckoutQuery.TotalAmount),
		)

		if err := h.paymentService.HandlePreCheckoutQuery(c.Context(), update.PreCheckoutQuery); err != nil {
			h.logger.Error("failed to handle pre-checkout query",
				slog.String("error", err.Error()),
			)
			// Still return 200 to Telegram - we've already sent the answer
			return c.SendStatus(fiber.StatusOK)
		}

		return c.SendStatus(fiber.StatusOK)
	}

	// Handle successful payment
	if update.Message != nil && update.Message.SuccessfulPayment != nil {
		payment := update.Message.SuccessfulPayment

		h.logger.Info("received successful payment",
			slog.String("charge_id", payment.TelegramPaymentChargeID),
			slog.Int("amount", payment.TotalAmount),
			slog.String("currency", payment.Currency),
		)

		if err := h.paymentService.HandleSuccessfulPayment(c.Context(), payment); err != nil {
			h.logger.Error("failed to process successful payment",
				slog.String("charge_id", payment.TelegramPaymentChargeID),
				slog.String("error", err.Error()),
			)

			// Check error type to decide on retry strategy
			// For transient errors (database), return 500 to trigger Telegram retry
			// For permanent errors (invalid payload, duplicate), return 200
			if errors.Is(err, errors.ErrDatabase) {
				h.logger.Warn("transient error processing payment, returning 500 for retry",
					slog.String("charge_id", payment.TelegramPaymentChargeID),
				)
				return c.SendStatus(fiber.StatusInternalServerError)
			}

			// Permanent errors - payment data invalid or already processed
			return c.SendStatus(fiber.StatusOK)
		}

		return c.SendStatus(fiber.StatusOK)
	}

	// Unknown update type - log and ignore
	h.logger.Warn("received unknown webhook update",
		slog.Int64("update_id", update.UpdateID),
	)

	return c.SendStatus(fiber.StatusOK)
}
