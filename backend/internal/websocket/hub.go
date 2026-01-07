package websocket

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	"github.com/gofiber/contrib/websocket"
)

// Message types
const (
	MessageTypeSubscribe   = "subscribe"
	MessageTypeUnsubscribe = "unsubscribe"
	MessageTypePriceUpdate = "price_update"
	MessageTypePing        = "ping"
	MessageTypePong        = "pong"
	MessageTypeError       = "error"
)

// Message represents a WebSocket message
type Message struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

// SubscribePayload represents the subscribe message payload
type SubscribePayload struct {
	Symbols []string `json:"symbols"`
}

// PriceUpdate represents a price update message
type PriceUpdate struct {
	Symbol       string  `json:"symbol"`
	Price        float64 `json:"price"`
	Change24hPct float64 `json:"change24hPct"`
	Volume24h    float64 `json:"volume24h"`
	UpdatedAt    string  `json:"updatedAt"`
}

// Client represents a WebSocket client
type Client struct {
	ID            string
	Conn          *websocket.Conn
	Hub           *Hub
	Subscriptions map[string]bool
	Send          chan []byte
	mu            sync.RWMutex
}

// Hub maintains active clients and broadcasts messages
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	symbols    map[string]map[*Client]bool // symbol -> clients subscribed
	mu         sync.RWMutex
	logger     *slog.Logger
}

// NewHub creates a new Hub
func NewHub(logger *slog.Logger) *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		symbols:    make(map[string]map[*Client]bool),
		logger:     logger,
	}
}

// Run starts the hub
func (h *Hub) Run(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			h.mu.Lock()
			for client := range h.clients {
				close(client.Send)
				delete(h.clients, client)
			}
			h.mu.Unlock()
			return

		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			h.logger.Debug("client registered", slog.String("client_id", client.ID))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				// Remove from all symbol subscriptions
				for symbol := range client.Subscriptions {
					if clients, exists := h.symbols[symbol]; exists {
						delete(clients, client)
						if len(clients) == 0 {
							delete(h.symbols, symbol)
						}
					}
				}
				delete(h.clients, client)
				close(client.Send)
			}
			h.mu.Unlock()
			h.logger.Debug("client unregistered", slog.String("client_id", client.ID))

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.Send <- message:
				default:
					// Client buffer full, skip
				}
			}
			h.mu.RUnlock()

		case <-ticker.C:
			// Send ping to all clients
			h.pingClients()
		}
	}
}

// pingClients sends ping to all connected clients
func (h *Hub) pingClients() {
	msg, _ := json.Marshal(Message{Type: MessageTypePing})
	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		select {
		case client.Send <- msg:
		default:
		}
	}
}

// Subscribe adds a client to symbol subscriptions
func (h *Hub) Subscribe(client *Client, symbols []string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	client.mu.Lock()
	defer client.mu.Unlock()

	for _, symbol := range symbols {
		if _, exists := h.symbols[symbol]; !exists {
			h.symbols[symbol] = make(map[*Client]bool)
		}
		h.symbols[symbol][client] = true
		client.Subscriptions[symbol] = true
	}

	h.logger.Debug("client subscribed",
		slog.String("client_id", client.ID),
		slog.Any("symbols", symbols),
	)
}

// Unsubscribe removes a client from symbol subscriptions
func (h *Hub) Unsubscribe(client *Client, symbols []string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	client.mu.Lock()
	defer client.mu.Unlock()

	for _, symbol := range symbols {
		if clients, exists := h.symbols[symbol]; exists {
			delete(clients, client)
			if len(clients) == 0 {
				delete(h.symbols, symbol)
			}
		}
		delete(client.Subscriptions, symbol)
	}
}

// BroadcastPrice sends price update to subscribed clients
func (h *Hub) BroadcastPrice(update PriceUpdate) {
	payload, err := json.Marshal(update)
	if err != nil {
		return
	}

	msg, err := json.Marshal(Message{
		Type:    MessageTypePriceUpdate,
		Payload: payload,
	})
	if err != nil {
		return
	}

	h.mu.RLock()
	clients, exists := h.symbols[update.Symbol]
	if !exists {
		h.mu.RUnlock()
		return
	}

	// Copy clients to avoid holding lock during send
	clientList := make([]*Client, 0, len(clients))
	for client := range clients {
		clientList = append(clientList, client)
	}
	h.mu.RUnlock()

	for _, client := range clientList {
		select {
		case client.Send <- msg:
		default:
			// Client buffer full, skip
		}
	}
}

// GetSubscribedSymbols returns all currently subscribed symbols
func (h *Hub) GetSubscribedSymbols() []string {
	h.mu.RLock()
	defer h.mu.RUnlock()

	symbols := make([]string, 0, len(h.symbols))
	for symbol := range h.symbols {
		symbols = append(symbols, symbol)
	}
	return symbols
}

// ClientCount returns the number of connected clients
func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// Register adds a client to the hub
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Unregister removes a client from the hub
func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}
