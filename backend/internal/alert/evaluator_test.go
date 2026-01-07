package alert

import (
	"context"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/weqory/backend/internal/binance"
)

func TestEvaluator_PriceAbove(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	evaluator := NewEvaluator(nil, logger)

	tests := []struct {
		name           string
		alert          *Alert
		priceData      *binance.PriceData
		shouldTrigger  bool
	}{
		{
			name: "triggers when price above target",
			alert: &Alert{
				ID:             1,
				AlertType:      AlertTypePriceAbove,
				ConditionValue: 50000,
				IsPaused:       false,
			},
			priceData: &binance.PriceData{
				Price: 51000,
			},
			shouldTrigger: true,
		},
		{
			name: "does not trigger when price below target",
			alert: &Alert{
				ID:             2,
				AlertType:      AlertTypePriceAbove,
				ConditionValue: 50000,
				IsPaused:       false,
			},
			priceData: &binance.PriceData{
				Price: 49000,
			},
			shouldTrigger: false,
		},
		{
			name: "does not trigger when price equals target",
			alert: &Alert{
				ID:             3,
				AlertType:      AlertTypePriceAbove,
				ConditionValue: 50000,
				IsPaused:       false,
			},
			priceData: &binance.PriceData{
				Price: 50000,
			},
			shouldTrigger: false,
		},
		{
			name: "does not trigger when paused",
			alert: &Alert{
				ID:             4,
				AlertType:      AlertTypePriceAbove,
				ConditionValue: 50000,
				IsPaused:       true,
			},
			priceData: &binance.PriceData{
				Price: 60000,
			},
			shouldTrigger: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event, err := evaluator.Evaluate(context.Background(), tt.alert, tt.priceData)
			require.NoError(t, err)

			if tt.shouldTrigger {
				require.NotNil(t, event)
				assert.Equal(t, tt.alert.ID, event.AlertID)
				assert.Equal(t, tt.priceData.Price, event.TriggeredPrice)
			} else {
				assert.Nil(t, event)
			}
		})
	}
}

func TestEvaluator_PriceBelow(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	evaluator := NewEvaluator(nil, logger)

	tests := []struct {
		name          string
		alert         *Alert
		priceData     *binance.PriceData
		shouldTrigger bool
	}{
		{
			name: "triggers when price below target",
			alert: &Alert{
				ID:             1,
				AlertType:      AlertTypePriceBelow,
				ConditionValue: 50000,
				IsPaused:       false,
			},
			priceData: &binance.PriceData{
				Price: 49000,
			},
			shouldTrigger: true,
		},
		{
			name: "does not trigger when price above target",
			alert: &Alert{
				ID:             2,
				AlertType:      AlertTypePriceBelow,
				ConditionValue: 50000,
				IsPaused:       false,
			},
			priceData: &binance.PriceData{
				Price: 51000,
			},
			shouldTrigger: false,
		},
		{
			name: "does not trigger when price equals target",
			alert: &Alert{
				ID:             3,
				AlertType:      AlertTypePriceBelow,
				ConditionValue: 50000,
				IsPaused:       false,
			},
			priceData: &binance.PriceData{
				Price: 50000,
			},
			shouldTrigger: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event, err := evaluator.Evaluate(context.Background(), tt.alert, tt.priceData)
			require.NoError(t, err)

			if tt.shouldTrigger {
				require.NotNil(t, event)
				assert.Equal(t, tt.alert.ID, event.AlertID)
			} else {
				assert.Nil(t, event)
			}
		})
	}
}

func TestEvaluator_PriceChangePct(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	evaluator := NewEvaluator(nil, logger)

	tests := []struct {
		name          string
		alert         *Alert
		priceData     *binance.PriceData
		shouldTrigger bool
	}{
		{
			name: "triggers when positive change exceeds target",
			alert: &Alert{
				ID:             1,
				AlertType:      AlertTypePriceChangePct,
				ConditionValue: 5.0, // 5%
				IsPaused:       false,
			},
			priceData: &binance.PriceData{
				Price:         52500,
				ChangePercent: 7.5, // 7.5% change
			},
			shouldTrigger: true,
		},
		{
			name: "triggers when negative change exceeds target (absolute)",
			alert: &Alert{
				ID:             2,
				AlertType:      AlertTypePriceChangePct,
				ConditionValue: 5.0, // 5%
				IsPaused:       false,
			},
			priceData: &binance.PriceData{
				Price:         47500,
				ChangePercent: -6.0, // -6% change, abs = 6%
			},
			shouldTrigger: true,
		},
		{
			name: "does not trigger when change below target",
			alert: &Alert{
				ID:             3,
				AlertType:      AlertTypePriceChangePct,
				ConditionValue: 5.0, // 5%
				IsPaused:       false,
			},
			priceData: &binance.PriceData{
				Price:         51000,
				ChangePercent: 2.0, // 2% change
			},
			shouldTrigger: false,
		},
		{
			name: "triggers when change equals target exactly",
			alert: &Alert{
				ID:             4,
				AlertType:      AlertTypePriceChangePct,
				ConditionValue: 5.0, // 5%
				IsPaused:       false,
			},
			priceData: &binance.PriceData{
				Price:         52500,
				ChangePercent: 5.0, // exactly 5%
			},
			shouldTrigger: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event, err := evaluator.Evaluate(context.Background(), tt.alert, tt.priceData)
			require.NoError(t, err)

			if tt.shouldTrigger {
				require.NotNil(t, event)
				assert.Equal(t, tt.alert.ID, event.AlertID)
			} else {
				assert.Nil(t, event)
			}
		})
	}
}

func TestEvaluator_Periodic(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	evaluator := NewEvaluator(nil, logger)

	now := time.Now()
	twoHoursAgo := now.Add(-2 * time.Hour)
	thirtyMinutesAgo := now.Add(-30 * time.Minute)

	tests := []struct {
		name          string
		alert         *Alert
		shouldTrigger bool
	}{
		{
			name: "triggers on first time (never triggered)",
			alert: &Alert{
				ID:               1,
				AlertType:        AlertTypePeriodic,
				PeriodicInterval: "1h",
				LastTriggeredAt:  nil,
				IsPaused:         false,
			},
			shouldTrigger: true,
		},
		{
			name: "triggers when interval elapsed",
			alert: &Alert{
				ID:               2,
				AlertType:        AlertTypePeriodic,
				PeriodicInterval: "1h",
				LastTriggeredAt:  &twoHoursAgo,
				IsPaused:         false,
			},
			shouldTrigger: true,
		},
		{
			name: "does not trigger when interval not elapsed",
			alert: &Alert{
				ID:               3,
				AlertType:        AlertTypePeriodic,
				PeriodicInterval: "1h",
				LastTriggeredAt:  &thirtyMinutesAgo,
				IsPaused:         false,
			},
			shouldTrigger: false,
		},
		{
			name: "does not trigger without interval",
			alert: &Alert{
				ID:               4,
				AlertType:        AlertTypePeriodic,
				PeriodicInterval: "",
				LastTriggeredAt:  nil,
				IsPaused:         false,
			},
			shouldTrigger: false,
		},
	}

	priceData := &binance.PriceData{Price: 50000}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event, err := evaluator.Evaluate(context.Background(), tt.alert, priceData)
			require.NoError(t, err)

			if tt.shouldTrigger {
				require.NotNil(t, event)
				assert.Equal(t, tt.alert.ID, event.AlertID)
			} else {
				assert.Nil(t, event)
			}
		})
	}
}

func TestEvaluator_EvaluateBatch(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	evaluator := NewEvaluator(nil, logger)

	alerts := []*Alert{
		{
			ID:             1,
			BinanceSymbol:  "BTCUSDT",
			AlertType:      AlertTypePriceAbove,
			ConditionValue: 50000,
			IsPaused:       false,
		},
		{
			ID:             2,
			BinanceSymbol:  "ETHUSDT",
			AlertType:      AlertTypePriceBelow,
			ConditionValue: 3000,
			IsPaused:       false,
		},
		{
			ID:             3,
			BinanceSymbol:  "BTCUSDT",
			AlertType:      AlertTypePriceAbove,
			ConditionValue: 60000,
			IsPaused:       false,
		},
	}

	prices := map[string]*binance.PriceData{
		"BTCUSDT": {Price: 55000},
		"ETHUSDT": {Price: 2500},
	}

	events, err := evaluator.EvaluateBatch(context.Background(), alerts, prices)
	require.NoError(t, err)

	// Alert 1 should trigger (BTC 55000 > 50000)
	// Alert 2 should trigger (ETH 2500 < 3000)
	// Alert 3 should not trigger (BTC 55000 < 60000)
	assert.Len(t, events, 2)

	triggeredIDs := make([]int64, len(events))
	for i, e := range events {
		triggeredIDs[i] = e.AlertID
	}
	assert.Contains(t, triggeredIDs, int64(1))
	assert.Contains(t, triggeredIDs, int64(2))
	assert.NotContains(t, triggeredIDs, int64(3))
}

func TestEvaluator_SkipsMissingPriceData(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	evaluator := NewEvaluator(nil, logger)

	alerts := []*Alert{
		{
			ID:             1,
			BinanceSymbol:  "BTCUSDT",
			AlertType:      AlertTypePriceAbove,
			ConditionValue: 50000,
			IsPaused:       false,
		},
		{
			ID:             2,
			BinanceSymbol:  "UNKNOWN",
			AlertType:      AlertTypePriceAbove,
			ConditionValue: 100,
			IsPaused:       false,
		},
	}

	prices := map[string]*binance.PriceData{
		"BTCUSDT": {Price: 55000},
		// UNKNOWN is not in prices map
	}

	events, err := evaluator.EvaluateBatch(context.Background(), alerts, prices)
	require.NoError(t, err)

	// Only alert 1 should trigger, alert 2 should be skipped
	assert.Len(t, events, 1)
	assert.Equal(t, int64(1), events[0].AlertID)
}

func TestParseTimeframe(t *testing.T) {
	tests := []struct {
		input    string
		expected time.Duration
	}{
		{"1m", 1 * time.Minute},
		{"5m", 5 * time.Minute},
		{"15m", 15 * time.Minute},
		{"30m", 30 * time.Minute},
		{"1h", 1 * time.Hour},
		{"4h", 4 * time.Hour},
		{"12h", 12 * time.Hour},
		{"24h", 24 * time.Hour},
		{"1d", 24 * time.Hour},
		{"7d", 7 * 24 * time.Hour},
		{"30d", 30 * 24 * time.Hour},
		{"", 0},
		{"invalid", 0},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := parseTimeframe(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestCompareValue(t *testing.T) {
	tests := []struct {
		name     string
		value    float64
		op       ConditionOperator
		target   float64
		expected bool
	}{
		{"greater than - true", 100, OperatorGreaterThan, 50, true},
		{"greater than - false", 50, OperatorGreaterThan, 100, false},
		{"greater than - equal", 50, OperatorGreaterThan, 50, false},

		{"less than - true", 50, OperatorLessThan, 100, true},
		{"less than - false", 100, OperatorLessThan, 50, false},
		{"less than - equal", 50, OperatorLessThan, 50, false},

		{"equals - true", 50, OperatorEquals, 50, true},
		{"equals - false", 50, OperatorEquals, 51, false},
		{"equals - epsilon", 50.0000000001, OperatorEquals, 50, true},

		{"not equals - true", 50, OperatorNotEquals, 51, true},
		{"not equals - false", 50, OperatorNotEquals, 50, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := compareValue(tt.value, tt.op, tt.target)
			assert.Equal(t, tt.expected, result)
		})
	}
}
