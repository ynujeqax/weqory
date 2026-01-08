package telegram

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"
)

const (
	telegramAPIURL = "https://api.telegram.org/bot"

	// Timeouts
	requestTimeout = 30 * time.Second

	// Rate limiting
	maxRequestsPerSecond = 30
)

// Client is a Telegram Bot API client
type Client struct {
	token      string
	httpClient *http.Client
	logger     *slog.Logger
	baseURL    string
}

// NewClient creates a new Telegram Bot API client
func NewClient(token string, logger *slog.Logger) *Client {
	return &Client{
		token: token,
		httpClient: &http.Client{
			Timeout: requestTimeout,
		},
		logger:  logger,
		baseURL: telegramAPIURL + token,
	}
}

// SendMessage sends a text message to a chat
func (c *Client) SendMessage(ctx context.Context, req SendMessageRequest) (*NotificationResult, error) {
	result := &NotificationResult{
		SentAt: time.Now(),
	}

	// Set default parse mode
	if req.ParseMode == "" {
		req.ParseMode = "HTML"
	}

	data, err := json.Marshal(req)
	if err != nil {
		result.Error = fmt.Errorf("failed to marshal request: %w", err)
		return result, result.Error
	}

	resp, err := c.doRequest(ctx, "sendMessage", data)
	if err != nil {
		result.Error = err
		return result, err
	}

	if !resp.OK {
		// Check for rate limiting
		if resp.Parameters != nil && resp.Parameters.RetryAfter > 0 {
			result.RetryAfter = resp.Parameters.RetryAfter
			result.Error = fmt.Errorf("rate limited, retry after %d seconds", resp.Parameters.RetryAfter)
			return result, result.Error
		}

		result.Error = fmt.Errorf("telegram API error: %s (code: %d)", resp.Description, resp.ErrorCode)
		return result, result.Error
	}

	// Parse sent message
	var msg SentMessage
	if err := json.Unmarshal(resp.Result, &msg); err != nil {
		result.Error = fmt.Errorf("failed to parse response: %w", err)
		return result, result.Error
	}

	result.Success = true
	result.MessageID = msg.MessageID
	return result, nil
}

// SendAlertNotification sends an alert notification to a user
func (c *Client) SendAlertNotification(ctx context.Context, notification AlertNotification, miniAppURL string) (*NotificationResult, error) {
	text := formatAlertMessage(notification)

	// Create inline keyboard with "Open App" button
	var replyMarkup *InlineKeyboardMarkup
	if miniAppURL != "" {
		replyMarkup = &InlineKeyboardMarkup{
			InlineKeyboard: [][]InlineKeyboardButton{
				{
					{
						Text: "📱 Open Weqory",
						WebApp: &WebAppInfo{URL: miniAppURL},
					},
				},
			},
		}
	}

	req := SendMessageRequest{
		ChatID:                notification.TelegramID,
		Text:                  text,
		ParseMode:             "HTML",
		DisableWebPagePreview: true,
		ReplyMarkup:           replyMarkup,
	}

	result, err := c.SendMessage(ctx, req)
	if err != nil {
		c.logger.Error("failed to send alert notification",
			slog.Int64("telegram_id", notification.TelegramID),
			slog.String("symbol", notification.CoinSymbol),
			slog.String("error", err.Error()),
		)
	} else {
		c.logger.Info("sent alert notification",
			slog.Int64("telegram_id", notification.TelegramID),
			slog.String("symbol", notification.CoinSymbol),
			slog.Int64("message_id", result.MessageID),
		)
	}

	return result, err
}

// doRequest performs an HTTP request to Telegram API
func (c *Client) doRequest(ctx context.Context, method string, body []byte) (*APIResponse, error) {
	url := fmt.Sprintf("%s/%s", c.baseURL, method)

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var apiResp APIResponse
	if err := json.Unmarshal(respBody, &apiResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &apiResp, nil
}

// GetMe returns information about the bot
func (c *Client) GetMe(ctx context.Context) (*User, error) {
	resp, err := c.doRequest(ctx, "getMe", nil)
	if err != nil {
		return nil, err
	}

	if !resp.OK {
		return nil, fmt.Errorf("telegram API error: %s", resp.Description)
	}

	var user User
	if err := json.Unmarshal(resp.Result, &user); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &user, nil
}

// formatAlertMessage formats an alert notification message
func formatAlertMessage(n AlertNotification) string {
	var icon string
	var action string

	switch n.AlertType {
	case "PRICE_ABOVE":
		icon = "🔺"
		action = "rose above"
	case "PRICE_BELOW":
		icon = "🔻"
		action = "fell below"
	case "PERCENT_UP":
		icon = "📈"
		action = fmt.Sprintf("increased by %.2f%%", n.PriceChange)
	case "PERCENT_DOWN":
		icon = "📉"
		action = fmt.Sprintf("decreased by %.2f%%", n.PriceChange)
	case "PRICE_CHANGE":
		if n.PriceChange >= 0 {
			icon = "📈"
			action = fmt.Sprintf("changed by +%.2f%%", n.PriceChange)
		} else {
			icon = "📉"
			action = fmt.Sprintf("changed by %.2f%%", n.PriceChange)
		}
	case "PERIODIC":
		icon = "🔔"
		action = "periodic update"
	default:
		icon = "⚡"
		action = "triggered"
	}

	coinDisplay := n.CoinSymbol
	if n.CoinName != "" {
		coinDisplay = fmt.Sprintf("%s (%s)", n.CoinName, n.CoinSymbol)
	}

	message := fmt.Sprintf(`%s <b>Alert Triggered!</b>

<b>%s</b> %s

💰 Current Price: <b>$%s</b>
🎯 Target: $%s
⏰ %s`,
		icon,
		coinDisplay,
		action,
		formatPrice(n.TriggeredPrice),
		formatPrice(n.ConditionValue),
		n.TriggeredAt.Format("15:04:05 MST"),
	)

	if n.IsRecurring {
		message += "\n\n🔄 <i>This is a recurring alert</i>"
	}

	return message
}

// formatPrice formats a price for display
func formatPrice(price float64) string {
	if price >= 1000 {
		return fmt.Sprintf("%.2f", price)
	} else if price >= 1 {
		return fmt.Sprintf("%.4f", price)
	} else if price >= 0.0001 {
		return fmt.Sprintf("%.6f", price)
	}
	return fmt.Sprintf("%.8f", price)
}

// ========== Telegram Stars Payment Methods ==========

// CreateInvoiceLink creates an invoice link for Telegram Stars payment
// This is used by Mini Apps to initiate payment flow
func (c *Client) CreateInvoiceLink(ctx context.Context, req CreateInvoiceLinkRequest) (string, error) {
	// Telegram Stars uses "XTR" as currency
	if req.Currency == "" {
		req.Currency = "XTR"
	}

	data, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := c.doRequest(ctx, "createInvoiceLink", data)
	if err != nil {
		return "", err
	}

	if !resp.OK {
		return "", fmt.Errorf("telegram API error: %s (code: %d)", resp.Description, resp.ErrorCode)
	}

	// Response is a string with the invoice link
	var invoiceLink string
	if err := json.Unmarshal(resp.Result, &invoiceLink); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	c.logger.Info("created invoice link",
		slog.String("title", req.Title),
		slog.Int("amount", req.Prices[0].Amount),
	)

	return invoiceLink, nil
}

// SendInvoice sends an invoice to a chat
func (c *Client) SendInvoice(ctx context.Context, req SendInvoiceRequest) (*NotificationResult, error) {
	result := &NotificationResult{
		SentAt: time.Now(),
	}

	// Telegram Stars uses "XTR" as currency
	if req.Currency == "" {
		req.Currency = "XTR"
	}

	data, err := json.Marshal(req)
	if err != nil {
		result.Error = fmt.Errorf("failed to marshal request: %w", err)
		return result, result.Error
	}

	resp, err := c.doRequest(ctx, "sendInvoice", data)
	if err != nil {
		result.Error = err
		return result, err
	}

	if !resp.OK {
		if resp.Parameters != nil && resp.Parameters.RetryAfter > 0 {
			result.RetryAfter = resp.Parameters.RetryAfter
			result.Error = fmt.Errorf("rate limited, retry after %d seconds", resp.Parameters.RetryAfter)
			return result, result.Error
		}

		result.Error = fmt.Errorf("telegram API error: %s (code: %d)", resp.Description, resp.ErrorCode)
		return result, result.Error
	}

	var msg SentMessage
	if err := json.Unmarshal(resp.Result, &msg); err != nil {
		result.Error = fmt.Errorf("failed to parse response: %w", err)
		return result, result.Error
	}

	result.Success = true
	result.MessageID = msg.MessageID

	c.logger.Info("sent invoice",
		slog.Int64("chat_id", req.ChatID),
		slog.String("title", req.Title),
		slog.Int64("message_id", result.MessageID),
	)

	return result, nil
}

// AnswerPreCheckoutQuery responds to a pre-checkout query
// This must be called within 10 seconds of receiving the query
func (c *Client) AnswerPreCheckoutQuery(ctx context.Context, req AnswerPreCheckoutQueryRequest) error {
	data, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := c.doRequest(ctx, "answerPreCheckoutQuery", data)
	if err != nil {
		return err
	}

	if !resp.OK {
		return fmt.Errorf("telegram API error: %s (code: %d)", resp.Description, resp.ErrorCode)
	}

	c.logger.Info("answered pre-checkout query",
		slog.String("query_id", req.PreCheckoutQueryID),
		slog.Bool("ok", req.OK),
	)

	return nil
}

// CreateSubscriptionInvoiceLink is a helper to create invoice for subscription plans
func (c *Client) CreateSubscriptionInvoiceLink(ctx context.Context, plan, period string, starsAmount int, payload string) (string, error) {
	var title, description string

	switch plan {
	case "pro":
		title = "Weqory Pro"
		description = "Unlock Pro features: 9 coins, 18 alerts, 7-day history"
	case "ultimate":
		title = "Weqory Ultimate"
		description = "Unlimited power: 27 coins, 54 alerts, 30-day history"
	default:
		return "", fmt.Errorf("invalid plan: %s", plan)
	}

	if period == "yearly" {
		title += " (Annual)"
		description += " - Save 20% with annual billing!"
	} else {
		title += " (Monthly)"
	}

	req := CreateInvoiceLinkRequest{
		Title:       title,
		Description: description,
		Payload:     payload,
		Currency:    "XTR",
		Prices: []LabeledPrice{
			{
				Label:  title,
				Amount: starsAmount,
			},
		},
	}

	return c.CreateInvoiceLink(ctx, req)
}
