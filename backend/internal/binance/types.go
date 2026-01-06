package binance

import (
	"encoding/json"
	"time"
)

// StreamType represents the type of Binance stream
type StreamType string

const (
	StreamTypeTicker   StreamType = "ticker"
	StreamTypeMiniTicker StreamType = "miniTicker"
	StreamTypeKline    StreamType = "kline"
)

// TickerUpdate represents a 24hr ticker update from Binance
type TickerUpdate struct {
	EventType          string  `json:"e"` // Event type: "24hrTicker"
	EventTime          int64   `json:"E"` // Event time
	Symbol             string  `json:"s"` // Symbol
	PriceChange        string  `json:"p"` // Price change
	PriceChangePercent string  `json:"P"` // Price change percent
	WeightedAvgPrice   string  `json:"w"` // Weighted average price
	LastPrice          string  `json:"c"` // Last price
	LastQuantity       string  `json:"Q"` // Last quantity
	BidPrice           string  `json:"b"` // Best bid price
	BidQuantity        string  `json:"B"` // Best bid quantity
	AskPrice           string  `json:"a"` // Best ask price
	AskQuantity        string  `json:"A"` // Best ask quantity
	OpenPrice          string  `json:"o"` // Open price
	HighPrice          string  `json:"h"` // High price
	LowPrice           string  `json:"l"` // Low price
	Volume             string  `json:"v"` // Total traded base asset volume
	QuoteVolume        string  `json:"q"` // Total traded quote asset volume
	OpenTime           int64   `json:"O"` // Statistics open time
	CloseTime          int64   `json:"C"` // Statistics close time
	FirstTradeID       int64   `json:"F"` // First trade ID
	LastTradeID        int64   `json:"L"` // Last trade ID
	TradeCount         int64   `json:"n"` // Total number of trades
}

// MiniTickerUpdate represents a mini ticker update (lighter weight)
type MiniTickerUpdate struct {
	EventType   string `json:"e"` // Event type: "24hrMiniTicker"
	EventTime   int64  `json:"E"` // Event time
	Symbol      string `json:"s"` // Symbol
	LastPrice   string `json:"c"` // Close price
	OpenPrice   string `json:"o"` // Open price
	HighPrice   string `json:"h"` // High price
	LowPrice    string `json:"l"` // Low price
	Volume      string `json:"v"` // Total traded base asset volume
	QuoteVolume string `json:"q"` // Total traded quote asset volume
}

// PriceData represents processed price data
type PriceData struct {
	Symbol        string    `json:"symbol"`
	Price         float64   `json:"price"`
	PriceChange   float64   `json:"price_change"`
	ChangePercent float64   `json:"change_percent"`
	High24h       float64   `json:"high_24h"`
	Low24h        float64   `json:"low_24h"`
	Volume24h     float64   `json:"volume_24h"`
	QuoteVolume   float64   `json:"quote_volume"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// StreamMessage represents a message from Binance WebSocket
type StreamMessage struct {
	Stream string          `json:"stream"`
	Data   json.RawMessage `json:"data"`
}

// SubscribeMessage represents a subscription request
type SubscribeMessage struct {
	Method string   `json:"method"`
	Params []string `json:"params"`
	ID     int      `json:"id"`
}
