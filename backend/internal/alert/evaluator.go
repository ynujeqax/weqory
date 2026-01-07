package alert

import (
	"context"
	"log/slog"
	"time"

	"github.com/weqory/backend/internal/binance"
	"github.com/weqory/backend/internal/cache"
)

// AlertType represents the type of alert
type AlertType string

const (
	AlertTypePriceAbove     AlertType = "PRICE_ABOVE"
	AlertTypePriceBelow     AlertType = "PRICE_BELOW"
	AlertTypePriceChangePct AlertType = "PRICE_CHANGE_PCT"
	AlertTypePeriodic       AlertType = "PERIODIC"
)

// ConditionOperator represents comparison operators
type ConditionOperator string

const (
	OperatorGreaterThan ConditionOperator = ">"
	OperatorLessThan    ConditionOperator = "<"
	OperatorEquals      ConditionOperator = "="
	OperatorNotEquals   ConditionOperator = "!="
)

// Alert represents an alert to be evaluated
type Alert struct {
	ID                 int64
	UserID             int64
	CoinSymbol         string
	BinanceSymbol      string
	AlertType          AlertType
	ConditionOperator  ConditionOperator
	ConditionValue     float64
	ConditionTimeframe string // e.g., "1h", "24h", "7d"
	IsRecurring        bool
	IsPaused           bool
	PeriodicInterval   string // e.g., "1h", "4h", "24h"
	TimesTriggered     int
	LastTriggeredAt    *time.Time
	PriceWhenCreated   float64
	CreatedAt          time.Time
}

// TriggerEvent represents a triggered alert event
type TriggerEvent struct {
	AlertID        int64
	UserID         int64
	CoinSymbol     string
	AlertType      AlertType
	ConditionValue float64
	TriggeredPrice float64
	TriggeredAt    time.Time
}

// Evaluator evaluates alert conditions
type Evaluator struct {
	priceCache *cache.PriceCache
	logger     *slog.Logger
}

// NewEvaluator creates a new alert evaluator
func NewEvaluator(priceCache *cache.PriceCache, logger *slog.Logger) *Evaluator {
	return &Evaluator{
		priceCache: priceCache,
		logger:     logger,
	}
}

// Evaluate checks if an alert should trigger based on current price
func (e *Evaluator) Evaluate(ctx context.Context, alert *Alert, priceData *binance.PriceData) (*TriggerEvent, error) {
	if alert.IsPaused {
		return nil, nil
	}

	// Check periodic interval cooldown
	if alert.LastTriggeredAt != nil && alert.PeriodicInterval != "" {
		interval := parseInterval(alert.PeriodicInterval)
		if time.Since(*alert.LastTriggeredAt) < interval {
			return nil, nil
		}
	}

	triggered, err := e.checkCondition(ctx, alert, priceData)
	if err != nil {
		return nil, err
	}

	if !triggered {
		return nil, nil
	}

	return &TriggerEvent{
		AlertID:        alert.ID,
		UserID:         alert.UserID,
		CoinSymbol:     alert.CoinSymbol,
		AlertType:      alert.AlertType,
		ConditionValue: alert.ConditionValue,
		TriggeredPrice: priceData.Price,
		TriggeredAt:    time.Now(),
	}, nil
}

func (e *Evaluator) checkCondition(ctx context.Context, alert *Alert, priceData *binance.PriceData) (bool, error) {
	switch alert.AlertType {
	case AlertTypePriceAbove:
		return priceData.Price > alert.ConditionValue, nil

	case AlertTypePriceBelow:
		return priceData.Price < alert.ConditionValue, nil

	case AlertTypePriceChangePct:
		return e.checkPriceChangePct(ctx, alert, priceData)

	case AlertTypePeriodic:
		return e.checkPeriodic(alert)

	default:
		e.logger.Warn("unknown alert type", slog.String("type", string(alert.AlertType)))
		return false, nil
	}
}

// checkPriceChangePct checks if price changed by at least X% within the timeframe
// Triggers when absolute change >= conditionValue (e.g., 5% up or down)
func (e *Evaluator) checkPriceChangePct(ctx context.Context, alert *Alert, priceData *binance.PriceData) (bool, error) {
	duration := parseTimeframe(alert.ConditionTimeframe)

	var changePercent float64
	var err error

	if duration == 0 {
		// Use 24h change from Binance data
		changePercent = priceData.ChangePercent
	} else {
		// Get historical price change for specified timeframe
		changePercent, err = e.priceCache.GetPriceChange(ctx, alert.BinanceSymbol, duration)
		if err != nil {
			return false, err
		}
	}

	// Trigger if absolute change >= target percentage
	absChange := changePercent
	if absChange < 0 {
		absChange = -absChange
	}
	return absChange >= alert.ConditionValue, nil
}

func (e *Evaluator) checkPeriodic(alert *Alert) (bool, error) {
	if alert.PeriodicInterval == "" {
		return false, nil
	}

	interval := parseInterval(alert.PeriodicInterval)
	if interval == 0 {
		return false, nil
	}

	// If never triggered, trigger now
	if alert.LastTriggeredAt == nil {
		return true, nil
	}

	// Check if enough time has passed
	return time.Since(*alert.LastTriggeredAt) >= interval, nil
}

// EvaluateBatch evaluates multiple alerts against price data
func (e *Evaluator) EvaluateBatch(ctx context.Context, alerts []*Alert, prices map[string]*binance.PriceData) ([]*TriggerEvent, error) {
	events := make([]*TriggerEvent, 0)

	for _, alert := range alerts {
		priceData, ok := prices[alert.BinanceSymbol]
		if !ok || priceData == nil {
			continue
		}

		event, err := e.Evaluate(ctx, alert, priceData)
		if err != nil {
			e.logger.Error("failed to evaluate alert",
				slog.Int64("alert_id", alert.ID),
				slog.String("error", err.Error()),
			)
			continue
		}

		if event != nil {
			events = append(events, event)
		}
	}

	return events, nil
}

// Helper functions

const floatEpsilon = 1e-9 // Tolerance for float comparison

func compareValue(value float64, op ConditionOperator, target float64) bool {
	switch op {
	case OperatorGreaterThan:
		return value > target
	case OperatorLessThan:
		return value < target
	case OperatorEquals:
		// Use epsilon comparison for float equality
		diff := value - target
		if diff < 0 {
			diff = -diff
		}
		return diff < floatEpsilon
	case OperatorNotEquals:
		// Use epsilon comparison for float inequality
		diff := value - target
		if diff < 0 {
			diff = -diff
		}
		return diff >= floatEpsilon
	default:
		return false
	}
}

func parseTimeframe(timeframe string) time.Duration {
	if timeframe == "" {
		return 0
	}

	switch timeframe {
	case "1m":
		return 1 * time.Minute
	case "5m":
		return 5 * time.Minute
	case "15m":
		return 15 * time.Minute
	case "30m":
		return 30 * time.Minute
	case "1h":
		return 1 * time.Hour
	case "4h":
		return 4 * time.Hour
	case "12h":
		return 12 * time.Hour
	case "24h", "1d":
		return 24 * time.Hour
	case "7d":
		return 7 * 24 * time.Hour
	case "30d":
		return 30 * 24 * time.Hour
	default:
		return 0
	}
}

func parseInterval(interval string) time.Duration {
	return parseTimeframe(interval)
}
