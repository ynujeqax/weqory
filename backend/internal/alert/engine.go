package alert

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/weqory/backend/internal/binance"
	"github.com/weqory/backend/internal/cache"
)

const (
	// How often to refresh alerts from database
	alertRefreshInterval = 30 * time.Second

	// How often to save price history
	priceHistorySaveInterval = 1 * time.Minute

	// Batch size for processing alerts
	alertBatchSize = 100
)

// TriggerHandler handles triggered alert events
type TriggerHandler func(event *TriggerEvent)

// Engine is the main alert processing engine
type Engine struct {
	pool           *pgxpool.Pool
	binanceClient  *binance.Client
	priceCache     *cache.PriceCache
	pricePublisher *PricePublisher
	evaluator      *Evaluator
	triggerHandler TriggerHandler
	logger         *slog.Logger

	alerts       map[int64]*Alert
	symbolAlerts map[string][]*Alert // symbol -> alerts
	mu           sync.RWMutex

	priceBuffer     map[string]*binance.PriceData
	priceBufferMu   sync.RWMutex
	lastHistorySave time.Time

	done chan struct{}
	wg   sync.WaitGroup
	ctx  context.Context
}

// NewEngine creates a new alert engine
func NewEngine(
	pool *pgxpool.Pool,
	binanceClient *binance.Client,
	priceCache *cache.PriceCache,
	pricePublisher *PricePublisher,
	logger *slog.Logger,
) *Engine {
	return &Engine{
		pool:           pool,
		binanceClient:  binanceClient,
		priceCache:     priceCache,
		pricePublisher: pricePublisher,
		evaluator:      NewEvaluator(priceCache, logger),
		logger:         logger,
		alerts:         make(map[int64]*Alert),
		symbolAlerts:   make(map[string][]*Alert),
		priceBuffer:    make(map[string]*binance.PriceData),
		done:           make(chan struct{}),
	}
}

// SetTriggerHandler sets the handler for triggered alerts
func (e *Engine) SetTriggerHandler(handler TriggerHandler) {
	e.triggerHandler = handler
}

// Run starts the alert engine
func (e *Engine) Run(ctx context.Context) error {
	e.logger.Info("starting alert engine")

	// Store context for price handler
	e.ctx = ctx

	// Load initial alerts
	if err := e.refreshAlerts(ctx); err != nil {
		return err
	}

	// Subscribe to price updates
	e.binanceClient.SetPriceHandler(e.handlePriceUpdate)

	// Start background tasks
	e.wg.Add(2)
	go e.alertRefreshLoop(ctx)
	go e.priceHistoryLoop(ctx)

	// Start Binance client
	if err := e.binanceClient.Run(ctx); err != nil {
		return err
	}

	return nil
}

// handlePriceUpdate processes incoming price updates from Binance
func (e *Engine) handlePriceUpdate(data binance.PriceData) {
	// Use engine's context (respects shutdown)
	ctx := e.ctx
	if ctx == nil {
		ctx = context.Background()
	}

	// Check if we're shutting down
	select {
	case <-ctx.Done():
		return
	default:
	}

	// Update price cache
	if err := e.priceCache.Set(ctx, data); err != nil {
		e.logger.Error("failed to cache price",
			slog.String("symbol", data.Symbol),
			slog.String("error", err.Error()),
		)
	}

	// Publish price update to WebSocket clients via Redis pub/sub
	if e.pricePublisher != nil {
		e.pricePublisher.Publish(ctx, data)
	}

	// Buffer price for history saving
	e.priceBufferMu.Lock()
	e.priceBuffer[data.Symbol] = &data
	e.priceBufferMu.Unlock()

	// Get alerts for this symbol - make a copy to avoid holding lock
	e.mu.RLock()
	alertsForSymbol := e.symbolAlerts[data.Symbol]
	// Deep copy the alert slice to avoid race conditions
	alerts := make([]*Alert, len(alertsForSymbol))
	for i, alert := range alertsForSymbol {
		// Create a copy of the alert to avoid concurrent modification
		alertCopy := *alert
		alerts[i] = &alertCopy
	}
	e.mu.RUnlock()

	if len(alerts) == 0 {
		return
	}

	// Evaluate alerts
	prices := map[string]*binance.PriceData{data.Symbol: &data}
	events, err := e.evaluator.EvaluateBatch(ctx, alerts, prices)
	if err != nil {
		e.logger.Error("failed to evaluate alerts", slog.String("error", err.Error()))
		return
	}

	// Process trigger events
	for _, event := range events {
		e.processTriggerEvent(ctx, event)
	}
}

// processTriggerEvent handles a triggered alert
func (e *Engine) processTriggerEvent(ctx context.Context, event *TriggerEvent) {
	e.logger.Info("alert triggered",
		slog.Int64("alert_id", event.AlertID),
		slog.Int64("user_id", event.UserID),
		slog.String("symbol", event.CoinSymbol),
		slog.Float64("price", event.TriggeredPrice),
	)

	// Update alert in database
	if err := e.markAlertTriggered(ctx, event.AlertID); err != nil {
		e.logger.Error("failed to mark alert triggered",
			slog.Int64("alert_id", event.AlertID),
			slog.String("error", err.Error()),
		)
	}

	// Create history record
	if err := e.createHistoryRecord(ctx, event); err != nil {
		e.logger.Error("failed to create history record",
			slog.Int64("alert_id", event.AlertID),
			slog.String("error", err.Error()),
		)
	}

	// Update local alert state
	e.mu.Lock()
	if alert, ok := e.alerts[event.AlertID]; ok {
		alert.TimesTriggered++
		now := time.Now()
		alert.LastTriggeredAt = &now

		// If non-recurring, pause the alert
		if !alert.IsRecurring && alert.PeriodicInterval == "" {
			alert.IsPaused = true
		}
	}
	e.mu.Unlock()

	// Call trigger handler
	if e.triggerHandler != nil {
		e.triggerHandler(event)
	}
}

// alertRefreshLoop periodically refreshes alerts from database
func (e *Engine) alertRefreshLoop(ctx context.Context) {
	defer e.wg.Done()

	ticker := time.NewTicker(alertRefreshInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-e.done:
			return
		case <-ticker.C:
			if err := e.refreshAlerts(ctx); err != nil {
				e.logger.Error("failed to refresh alerts", slog.String("error", err.Error()))
			}
		}
	}
}

// priceHistoryLoop periodically saves price history
func (e *Engine) priceHistoryLoop(ctx context.Context) {
	defer e.wg.Done()

	ticker := time.NewTicker(priceHistorySaveInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-e.done:
			return
		case <-ticker.C:
			e.saveAllPriceHistory(ctx)
		}
	}
}

// saveAllPriceHistory saves buffered prices to history
func (e *Engine) saveAllPriceHistory(ctx context.Context) {
	e.priceBufferMu.Lock()
	prices := e.priceBuffer
	e.priceBuffer = make(map[string]*binance.PriceData)
	e.priceBufferMu.Unlock()

	now := time.Now()
	for symbol, data := range prices {
		if err := e.priceCache.AddToHistory(ctx, symbol, data.Price, now); err != nil {
			e.logger.Error("failed to save price history",
				slog.String("symbol", symbol),
				slog.String("error", err.Error()),
			)
		}
	}

	e.lastHistorySave = now
}

// refreshAlerts loads/refreshes alerts from database
func (e *Engine) refreshAlerts(ctx context.Context) error {
	query := `
		SELECT a.id, a.user_id, c.symbol, c.binance_symbol, a.alert_type,
		       a.condition_operator, a.condition_value, a.condition_timeframe,
		       a.is_recurring, a.is_paused, a.periodic_interval, a.times_triggered,
		       a.last_triggered_at, a.price_when_created, a.created_at
		FROM alerts a
		JOIN coins c ON a.coin_id = c.id
		WHERE a.is_deleted = false AND a.is_paused = false
	`

	rows, err := e.pool.Query(ctx, query)
	if err != nil {
		return err
	}
	defer rows.Close()

	newAlerts := make(map[int64]*Alert)
	newSymbolAlerts := make(map[string][]*Alert)
	symbols := make(map[string]bool)

	for rows.Next() {
		var alert Alert
		var binanceSymbol *string

		err := rows.Scan(
			&alert.ID, &alert.UserID, &alert.CoinSymbol, &binanceSymbol,
			&alert.AlertType, &alert.ConditionOperator, &alert.ConditionValue,
			&alert.ConditionTimeframe, &alert.IsRecurring, &alert.IsPaused,
			&alert.PeriodicInterval, &alert.TimesTriggered, &alert.LastTriggeredAt,
			&alert.PriceWhenCreated, &alert.CreatedAt,
		)
		if err != nil {
			e.logger.Error("failed to scan alert", slog.String("error", err.Error()))
			continue
		}

		// Use binance_symbol if available, otherwise construct from coin symbol
		if binanceSymbol != nil && *binanceSymbol != "" {
			alert.BinanceSymbol = *binanceSymbol
		} else {
			alert.BinanceSymbol = alert.CoinSymbol + "USDT"
		}

		newAlerts[alert.ID] = &alert
		newSymbolAlerts[alert.BinanceSymbol] = append(newSymbolAlerts[alert.BinanceSymbol], &alert)
		symbols[alert.BinanceSymbol] = true
	}

	// Update subscriptions
	e.mu.Lock()
	oldSymbols := make(map[string]bool)
	for symbol := range e.symbolAlerts {
		oldSymbols[symbol] = true
	}
	e.alerts = newAlerts
	e.symbolAlerts = newSymbolAlerts
	e.mu.Unlock()

	// Subscribe to new symbols
	var toSubscribe []string
	for symbol := range symbols {
		if !oldSymbols[symbol] {
			toSubscribe = append(toSubscribe, symbol)
		}
	}

	if len(toSubscribe) > 0 {
		if err := e.binanceClient.Subscribe(toSubscribe); err != nil {
			e.logger.Error("failed to subscribe to symbols", slog.String("error", err.Error()))
		}
	}

	// Unsubscribe from removed symbols
	var toUnsubscribe []string
	for symbol := range oldSymbols {
		if !symbols[symbol] {
			toUnsubscribe = append(toUnsubscribe, symbol)
		}
	}

	if len(toUnsubscribe) > 0 {
		if err := e.binanceClient.Unsubscribe(toUnsubscribe); err != nil {
			e.logger.Error("failed to unsubscribe from symbols", slog.String("error", err.Error()))
		}
	}

	e.logger.Debug("refreshed alerts",
		slog.Int("count", len(newAlerts)),
		slog.Int("symbols", len(symbols)),
	)

	return nil
}

// markAlertTriggered updates the alert in database
func (e *Engine) markAlertTriggered(ctx context.Context, alertID int64) error {
	query := `
		UPDATE alerts
		SET times_triggered = times_triggered + 1,
		    last_triggered_at = NOW(),
		    updated_at = NOW()
		WHERE id = $1
	`
	_, err := e.pool.Exec(ctx, query, alertID)
	return err
}

// createHistoryRecord creates an alert history record
func (e *Engine) createHistoryRecord(ctx context.Context, event *TriggerEvent) error {
	query := `
		INSERT INTO alert_history (
			alert_id, user_id, coin_id, alert_type, condition_operator,
			condition_value, triggered_price, notified
		)
		SELECT $1, $2, a.coin_id, $3, a.condition_operator, a.condition_value, $4, false
		FROM alerts a
		WHERE a.id = $1
	`
	_, err := e.pool.Exec(ctx, query, event.AlertID, event.UserID, event.AlertType, event.TriggeredPrice)
	return err
}

// GetAlertCount returns the number of active alerts
func (e *Engine) GetAlertCount() int {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return len(e.alerts)
}

// GetSymbolCount returns the number of monitored symbols
func (e *Engine) GetSymbolCount() int {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return len(e.symbolAlerts)
}

// Stop stops the alert engine
func (e *Engine) Stop() {
	e.logger.Info("stopping alert engine")

	// Signal all goroutines to stop
	close(e.done)

	// Close Binance connection (stops price updates)
	e.binanceClient.Close()

	// Wait for background goroutines to finish with timeout
	done := make(chan struct{})
	go func() {
		e.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		e.logger.Info("all background tasks stopped")
	case <-time.After(10 * time.Second):
		e.logger.Warn("timeout waiting for background tasks to stop")
	}
}
