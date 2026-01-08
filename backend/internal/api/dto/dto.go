package dto

import "time"

// ============================================
// Common DTOs
// ============================================

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Details any    `json:"details,omitempty"`
}

// SuccessResponse represents a success response
type SuccessResponse struct {
	Message string `json:"message"`
}

// PaginatedResponse represents a paginated response
type PaginatedResponse[T any] struct {
	Items  []T   `json:"items"`
	Total  int64 `json:"total"`
	Limit  int   `json:"limit"`
	Offset int   `json:"offset"`
}

// ============================================
// Auth DTOs
// ============================================

// AuthRequest represents authentication request
type AuthRequest struct {
	InitData string `json:"init_data" validate:"required"`
}

// AuthResponse represents authentication response
type AuthResponse struct {
	User  *UserResponse `json:"user"`
	Token string        `json:"token"`
}

// ============================================
// User DTOs
// ============================================

// UserResponse represents user data in responses
type UserResponse struct {
	ID                   int64         `json:"id"`
	TelegramID           int64         `json:"telegram_id"`
	Username             *string       `json:"username"`
	FirstName            string        `json:"first_name"`
	LastName             *string       `json:"last_name"`
	LanguageCode         string        `json:"language_code"`
	Plan                 string        `json:"plan"`
	PlanExpiresAt        *time.Time    `json:"plan_expires_at"`
	PlanPeriod           *string       `json:"plan_period"`
	NotificationsUsed    int           `json:"notifications_used"`
	NotificationsResetAt *time.Time    `json:"notifications_reset_at"`
	NotificationsEnabled bool          `json:"notifications_enabled"`
	VibrationEnabled     bool          `json:"vibration_enabled"`
	Limits               *UserLimits   `json:"limits,omitempty"`
	CreatedAt            time.Time     `json:"created_at"`
	LastActiveAt         time.Time     `json:"last_active_at"`
}

// UserLimits represents user's plan limits
type UserLimits struct {
	MaxCoins             int   `json:"max_coins"`
	MaxAlerts            int   `json:"max_alerts"`
	MaxNotifications     *int  `json:"max_notifications"`
	HistoryRetentionDays int   `json:"history_retention_days"`
	CoinsUsed            int64 `json:"coins_used"`
	AlertsUsed           int64 `json:"alerts_used"`
}

// UpdateSettingsRequest represents settings update request
type UpdateSettingsRequest struct {
	NotificationsEnabled *bool `json:"notifications_enabled"`
	VibrationEnabled     *bool `json:"vibration_enabled"`
}

// ============================================
// Coin DTOs
// ============================================

// CoinResponse represents coin data in responses
type CoinResponse struct {
	ID               int      `json:"id"`
	Symbol           string   `json:"symbol"`
	Name             string   `json:"name"`
	BinanceSymbol    string   `json:"binance_symbol"`
	Rank             *int     `json:"rank,omitempty"`
	CurrentPrice     *float64 `json:"current_price,omitempty"`
	MarketCap        *float64 `json:"market_cap,omitempty"`
	Volume24h        *float64 `json:"volume_24h,omitempty"`
	PriceChange24hPct *float64 `json:"price_change_24h_pct,omitempty"`
}

// ============================================
// Watchlist DTOs
// ============================================

// WatchlistItemResponse represents a watchlist item
type WatchlistItemResponse struct {
	ID          int64         `json:"id"`
	Coin        *CoinResponse `json:"coin"`
	AlertsCount int64         `json:"alerts_count"`
	CreatedAt   time.Time     `json:"created_at"`
}

// WatchlistResponse represents the full watchlist
type WatchlistResponse struct {
	Items []WatchlistItemResponse `json:"items"`
	Total int                     `json:"total"`
	Limit int                     `json:"limit"`
}

// AddToWatchlistRequest represents add to watchlist request
type AddToWatchlistRequest struct {
	CoinSymbol string `json:"coin_symbol" validate:"required,coin_symbol"`
}

// AddToWatchlistResponse represents add to watchlist response
type AddToWatchlistResponse struct {
	ID      int64         `json:"id"`
	Coin    *CoinResponse `json:"coin"`
	AddedAt time.Time     `json:"added_at"`
}

// RemoveFromWatchlistResponse represents remove response
type RemoveFromWatchlistResponse struct {
	DeletedAlertsCount int64 `json:"deleted_alerts_count"`
}

// ============================================
// Alert DTOs
// ============================================

// AlertResponse represents an alert
type AlertResponse struct {
	ID                int64         `json:"id"`
	Coin              *CoinResponse `json:"coin"`
	AlertType         string        `json:"alert_type"`
	ConditionOperator string        `json:"condition_operator"`
	ConditionValue    float64       `json:"condition_value"`
	ConditionTimeframe *string      `json:"condition_timeframe,omitempty"`
	IsRecurring       bool          `json:"is_recurring"`
	IsPaused          bool          `json:"is_paused"`
	PeriodicInterval  *string       `json:"periodic_interval,omitempty"`
	TimesTriggered    int           `json:"times_triggered"`
	LastTriggeredAt   *time.Time    `json:"last_triggered_at,omitempty"`
	PriceWhenCreated  *float64      `json:"price_when_created,omitempty"`
	CreatedAt         time.Time     `json:"created_at"`
}

// AlertsResponse represents alerts list
type AlertsResponse struct {
	Items   []AlertResponse            `json:"items"`
	Total   int64                      `json:"total"`
	Limit   int                        `json:"limit"`
	Grouped map[string][]AlertResponse `json:"grouped,omitempty"`
}

// CreateAlertRequest represents create alert request
type CreateAlertRequest struct {
	CoinSymbol         string  `json:"coin_symbol" validate:"required,coin_symbol"`
	AlertType          string  `json:"alert_type" validate:"required,alert_type"`
	ConditionValue     float64 `json:"condition_value" validate:"required,gt=0"`
	ConditionTimeframe *string `json:"condition_timeframe,omitempty" validate:"omitempty,timeframe"`
	IsRecurring        bool    `json:"is_recurring"`
	PeriodicInterval   *string `json:"periodic_interval,omitempty" validate:"omitempty,timeframe"`
}

// UpdateAlertRequest represents update alert request
type UpdateAlertRequest struct {
	IsPaused *bool `json:"is_paused"`
}

// ============================================
// History DTOs
// ============================================

// AlertHistoryResponse represents alert history item
type AlertHistoryResponse struct {
	ID                 int64         `json:"id"`
	Coin               *CoinResponse `json:"coin"`
	AlertType          string        `json:"alert_type"`
	ConditionOperator  string        `json:"condition_operator"`
	ConditionValue     float64       `json:"condition_value"`
	ConditionTimeframe *string       `json:"condition_timeframe,omitempty"`
	TriggeredPrice     float64       `json:"triggered_price"`
	TriggeredAt        time.Time     `json:"triggered_at"`
}

// HistoryResponse represents history list
type HistoryResponse struct {
	Items         []AlertHistoryResponse `json:"items"`
	Total         int64                  `json:"total"`
	RetentionDays int                    `json:"retention_days"`
}

// ============================================
// Market DTOs
// ============================================

// MarketOverviewResponse represents market overview
type MarketOverviewResponse struct {
	TotalMarketCap       float64              `json:"total_market_cap"`
	TotalVolume24h       float64              `json:"total_volume_24h"`
	BTCDominance         float64              `json:"btc_dominance"`
	ETHDominance         float64              `json:"eth_dominance"`
	MarketCapChange24hPct float64             `json:"market_cap_change_24h_pct"`
	FearGreedIndex       *FearGreedResponse   `json:"fear_greed_index"`
	TopCoins             []CoinResponse       `json:"top_coins"`
}

// FearGreedResponse represents fear and greed index
type FearGreedResponse struct {
	Value          int    `json:"value"`
	Classification string `json:"classification"`
}

// ============================================
// Payment DTOs
// ============================================

// SubscriptionPlanResponse represents a subscription plan
type SubscriptionPlanResponse struct {
	Name                 string `json:"name"`
	MaxCoins             int    `json:"max_coins"`
	MaxAlerts            int    `json:"max_alerts"`
	MaxNotifications     *int   `json:"max_notifications"`
	HistoryRetentionDays int    `json:"history_retention_days"`
	PriceMonthly         *int   `json:"price_monthly"`
	PriceYearly          *int   `json:"price_yearly"`
}

// PlansResponse represents available plans
type PlansResponse struct {
	Plans []SubscriptionPlanResponse `json:"plans"`
}

// CreateInvoiceRequest represents invoice creation request
type CreateInvoiceRequest struct {
	Plan   string `json:"plan" validate:"required,plan"`
	Period string `json:"period" validate:"required,oneof=monthly yearly"`
}

// CreateInvoiceResponse represents invoice creation response
type CreateInvoiceResponse struct {
	InvoiceLink string `json:"invoice_link"`
	PaymentID   int64  `json:"payment_id"`
}

// PaymentResponse represents a payment record
type PaymentResponse struct {
	ID                int64      `json:"id"`
	Plan              string     `json:"plan"`
	Period            string     `json:"period"`
	StarsAmount       int        `json:"stars_amount"`
	Status            string     `json:"status"`
	CreatedAt         time.Time  `json:"created_at"`
	CompletedAt       *time.Time `json:"completed_at,omitempty"`
}

// PaymentHistoryResponse represents payment history
type PaymentHistoryResponse struct {
	Items []PaymentResponse `json:"items"`
	Total int               `json:"total"`
}
