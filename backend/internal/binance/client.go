package binance

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// Binance WebSocket endpoints
	wsBaseURL       = "wss://stream.binance.com:9443"
	wsStreamPath    = "/stream"
	wsCombinedPath  = "/stream?streams="

	// Connection settings
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = 30 * time.Second
	maxMessageSize = 1024 * 1024 // 1MB

	// Reconnection settings
	minReconnectDelay = 1 * time.Second
	maxReconnectDelay = 60 * time.Second
)

// PriceHandler is called when a new price update is received
type PriceHandler func(data PriceData)

// Client represents a Binance WebSocket client
type Client struct {
	conn          *websocket.Conn
	symbols       map[string]bool
	priceHandler  PriceHandler
	logger        *slog.Logger
	mu            sync.RWMutex
	done          chan struct{}
	reconnecting  bool
	subscriptionID int

	// pingDone signals the pingLoop to stop
	pingDone      chan struct{}
	pingMu        sync.Mutex
}

// NewClient creates a new Binance WebSocket client
func NewClient(logger *slog.Logger) *Client {
	return &Client{
		symbols: make(map[string]bool),
		logger:  logger,
		done:    make(chan struct{}),
	}
}

// SetPriceHandler sets the handler for price updates
func (c *Client) SetPriceHandler(handler PriceHandler) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.priceHandler = handler
}

// Connect establishes connection to Binance WebSocket
func (c *Client) Connect(ctx context.Context) error {
	c.mu.Lock()
	if c.conn != nil {
		c.mu.Unlock()
		return nil
	}
	c.mu.Unlock()

	return c.connect(ctx)
}

func (c *Client) connect(ctx context.Context) error {
	c.mu.Lock()
	symbols := make([]string, 0, len(c.symbols))
	for s := range c.symbols {
		symbols = append(symbols, s)
	}
	c.mu.Unlock()

	// Build stream URL
	url := wsBaseURL + wsStreamPath
	if len(symbols) > 0 {
		streams := make([]string, len(symbols))
		for i, s := range symbols {
			streams[i] = strings.ToLower(s) + "@ticker"
		}
		url = wsBaseURL + wsCombinedPath + strings.Join(streams, "/")
	}

	c.logger.Info("connecting to Binance WebSocket", slog.String("url", url))

	dialer := websocket.Dialer{
		HandshakeTimeout: 10 * time.Second,
	}

	conn, _, err := dialer.DialContext(ctx, url, nil)
	if err != nil {
		return fmt.Errorf("failed to connect to Binance: %w", err)
	}

	conn.SetReadLimit(maxMessageSize)
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	c.mu.Lock()
	c.conn = conn
	c.reconnecting = false
	c.mu.Unlock()

	c.logger.Info("connected to Binance WebSocket")

	return nil
}

// Subscribe subscribes to price updates for given symbols
func (c *Client) Subscribe(symbols []string) error {
	c.mu.Lock()
	for _, s := range symbols {
		c.symbols[s] = true
	}
	conn := c.conn
	c.subscriptionID++
	id := c.subscriptionID
	c.mu.Unlock()

	if conn == nil {
		return nil // Will subscribe on next connect
	}

	// Build subscription streams
	streams := make([]string, len(symbols))
	for i, s := range symbols {
		streams[i] = strings.ToLower(s) + "@ticker"
	}

	msg := SubscribeMessage{
		Method: "SUBSCRIBE",
		Params: streams,
		ID:     id,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal subscribe message: %w", err)
	}

	conn.SetWriteDeadline(time.Now().Add(writeWait))
	if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
		return fmt.Errorf("failed to send subscribe message: %w", err)
	}

	c.logger.Debug("subscribed to symbols", slog.Any("symbols", symbols))
	return nil
}

// Unsubscribe unsubscribes from price updates for given symbols
func (c *Client) Unsubscribe(symbols []string) error {
	c.mu.Lock()
	for _, s := range symbols {
		delete(c.symbols, s)
	}
	conn := c.conn
	c.subscriptionID++
	id := c.subscriptionID
	c.mu.Unlock()

	if conn == nil {
		return nil
	}

	streams := make([]string, len(symbols))
	for i, s := range symbols {
		streams[i] = strings.ToLower(s) + "@ticker"
	}

	msg := SubscribeMessage{
		Method: "UNSUBSCRIBE",
		Params: streams,
		ID:     id,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal unsubscribe message: %w", err)
	}

	conn.SetWriteDeadline(time.Now().Add(writeWait))
	if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
		return fmt.Errorf("failed to send unsubscribe message: %w", err)
	}

	c.logger.Debug("unsubscribed from symbols", slog.Any("symbols", symbols))
	return nil
}

// Run starts the client and handles messages
func (c *Client) Run(ctx context.Context) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-c.done:
			return nil
		default:
		}

		if err := c.Connect(ctx); err != nil {
			c.logger.Error("failed to connect", slog.String("error", err.Error()))
			c.handleReconnect(ctx)
			continue
		}

		if err := c.readMessages(ctx); err != nil {
			c.logger.Error("read error", slog.String("error", err.Error()))
			c.handleReconnect(ctx)
		}
	}
}

func (c *Client) readMessages(ctx context.Context) error {
	c.mu.RLock()
	conn := c.conn
	c.mu.RUnlock()

	if conn == nil {
		return fmt.Errorf("no connection")
	}

	// Create new pingDone channel for this connection
	c.pingMu.Lock()
	c.pingDone = make(chan struct{})
	pingDone := c.pingDone
	c.pingMu.Unlock()

	// Start ping goroutine
	go c.pingLoop(ctx, pingDone)

	// Ensure pingLoop stops when we exit
	defer func() {
		c.pingMu.Lock()
		if c.pingDone != nil {
			close(c.pingDone)
			c.pingDone = nil
		}
		c.pingMu.Unlock()
	}()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-c.done:
			return nil
		default:
		}

		// Re-read conn with lock to avoid race condition
		c.mu.RLock()
		conn = c.conn
		c.mu.RUnlock()

		if conn == nil {
			return fmt.Errorf("connection lost")
		}

		conn.SetReadDeadline(time.Now().Add(pongWait))
		_, message, err := conn.ReadMessage()
		if err != nil {
			return fmt.Errorf("read error: %w", err)
		}

		c.handleMessage(message)
	}
}

func (c *Client) handleMessage(data []byte) {
	// Try to parse as combined stream message
	var streamMsg StreamMessage
	if err := json.Unmarshal(data, &streamMsg); err == nil && streamMsg.Stream != "" {
		c.processTickerData(streamMsg.Data)
		return
	}

	// Try to parse as direct ticker message
	var ticker TickerUpdate
	if err := json.Unmarshal(data, &ticker); err == nil && ticker.EventType == "24hrTicker" {
		c.processTicker(ticker)
		return
	}

	// Could be subscription confirmation or error
	c.logger.Debug("received non-ticker message", slog.String("data", string(data)))
}

func (c *Client) processTickerData(data json.RawMessage) {
	var ticker TickerUpdate
	if err := json.Unmarshal(data, &ticker); err != nil {
		c.logger.Error("failed to unmarshal ticker", slog.String("error", err.Error()))
		return
	}
	c.processTicker(ticker)
}

func (c *Client) processTicker(ticker TickerUpdate) {
	price, _ := strconv.ParseFloat(ticker.LastPrice, 64)
	priceChange, _ := strconv.ParseFloat(ticker.PriceChange, 64)
	changePercent, _ := strconv.ParseFloat(ticker.PriceChangePercent, 64)
	high24h, _ := strconv.ParseFloat(ticker.HighPrice, 64)
	low24h, _ := strconv.ParseFloat(ticker.LowPrice, 64)
	volume24h, _ := strconv.ParseFloat(ticker.Volume, 64)
	quoteVolume, _ := strconv.ParseFloat(ticker.QuoteVolume, 64)

	priceData := PriceData{
		Symbol:        ticker.Symbol,
		Price:         price,
		PriceChange:   priceChange,
		ChangePercent: changePercent,
		High24h:       high24h,
		Low24h:        low24h,
		Volume24h:     volume24h,
		QuoteVolume:   quoteVolume,
		UpdatedAt:     time.Now(),
	}

	c.mu.RLock()
	handler := c.priceHandler
	c.mu.RUnlock()

	if handler != nil {
		handler(priceData)
	}
}

func (c *Client) pingLoop(ctx context.Context, pingDone chan struct{}) {
	ticker := time.NewTicker(pingPeriod)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-c.done:
			return
		case <-pingDone:
			return
		case <-ticker.C:
			c.mu.RLock()
			conn := c.conn
			c.mu.RUnlock()

			if conn == nil {
				return
			}

			conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				c.logger.Error("ping failed", slog.String("error", err.Error()))
				return
			}
		}
	}
}

func (c *Client) handleReconnect(ctx context.Context) {
	c.mu.Lock()
	if c.reconnecting {
		c.mu.Unlock()
		return
	}
	c.reconnecting = true

	// Close existing connection
	if c.conn != nil {
		if err := c.conn.Close(); err != nil {
			c.logger.Debug("error closing connection during reconnect", slog.String("error", err.Error()))
		}
		c.conn = nil
	}

	// Stop ping loop if running
	c.pingMu.Lock()
	if c.pingDone != nil {
		close(c.pingDone)
		c.pingDone = nil
	}
	c.pingMu.Unlock()

	c.mu.Unlock()

	delay := minReconnectDelay
	for {
		select {
		case <-ctx.Done():
			return
		case <-c.done:
			return
		case <-time.After(delay):
		}

		c.logger.Info("attempting to reconnect", slog.Duration("delay", delay))

		if err := c.connect(ctx); err != nil {
			c.logger.Error("reconnect failed", slog.String("error", err.Error()))
			delay = min(delay*2, maxReconnectDelay)
			continue
		}

		// Resubscribe to all symbols
		c.mu.RLock()
		symbols := make([]string, 0, len(c.symbols))
		for s := range c.symbols {
			symbols = append(symbols, s)
		}
		c.mu.RUnlock()

		if len(symbols) > 0 {
			if err := c.Subscribe(symbols); err != nil {
				c.logger.Error("resubscribe failed", slog.String("error", err.Error()))
			}
		}

		return
	}
}

// Close closes the connection
func (c *Client) Close() error {
	close(c.done)

	// Stop ping loop
	c.pingMu.Lock()
	if c.pingDone != nil {
		close(c.pingDone)
		c.pingDone = nil
	}
	c.pingMu.Unlock()

	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conn != nil {
		c.conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
		err := c.conn.Close()
		c.conn = nil
		return err
	}
	return nil
}

// GetSubscribedSymbols returns currently subscribed symbols
func (c *Client) GetSubscribedSymbols() []string {
	c.mu.RLock()
	defer c.mu.RUnlock()

	symbols := make([]string, 0, len(c.symbols))
	for s := range c.symbols {
		symbols = append(symbols, s)
	}
	return symbols
}

// IsConnected returns true if connected
func (c *Client) IsConnected() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.conn != nil
}
