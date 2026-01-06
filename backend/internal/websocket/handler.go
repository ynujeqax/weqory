package websocket

import (
	"encoding/json"
	"log/slog"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const (
	// Time allowed to write a message to the client
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the client
	pongWait = 60 * time.Second

	// Send pings to client with this period (must be less than pongWait)
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from client
	maxMessageSize = 512
)

// Handler handles WebSocket connections
type Handler struct {
	hub    *Hub
	logger *slog.Logger
}

// NewHandler creates a new WebSocket handler
func NewHandler(hub *Hub, logger *slog.Logger) *Handler {
	return &Handler{
		hub:    hub,
		logger: logger,
	}
}

// Upgrade returns a middleware that upgrades HTTP to WebSocket
func (h *Handler) Upgrade() fiber.Handler {
	return websocket.New(h.HandleConnection, websocket.Config{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	})
}

// HandleConnection handles a WebSocket connection
func (h *Handler) HandleConnection(conn *websocket.Conn) {
	client := &Client{
		ID:            uuid.New().String(),
		Conn:          conn,
		Hub:           h.hub,
		Subscriptions: make(map[string]bool),
		Send:          make(chan []byte, 256),
	}

	h.hub.Register(client)

	// Start goroutines for reading and writing
	go h.writePump(client)
	h.readPump(client)
}

// readPump pumps messages from the WebSocket connection to the hub
func (h *Handler) readPump(client *Client) {
	defer func() {
		h.hub.Unregister(client)
		client.Conn.Close()
	}()

	client.Conn.SetReadLimit(maxMessageSize)
	client.Conn.SetReadDeadline(time.Now().Add(pongWait))
	client.Conn.SetPongHandler(func(string) error {
		client.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := client.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				h.logger.Error("websocket read error",
					slog.String("client_id", client.ID),
					slog.String("error", err.Error()),
				)
			}
			break
		}

		h.handleMessage(client, message)
	}
}

// writePump pumps messages from the hub to the WebSocket connection
func (h *Handler) writePump(client *Client) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		client.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-client.Send:
			client.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel
				client.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := client.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			client.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := client.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleMessage processes incoming WebSocket messages
func (h *Handler) handleMessage(client *Client, data []byte) {
	var msg Message
	if err := json.Unmarshal(data, &msg); err != nil {
		h.sendError(client, "invalid message format")
		return
	}

	switch msg.Type {
	case MessageTypeSubscribe:
		var payload SubscribePayload
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			h.sendError(client, "invalid subscribe payload")
			return
		}
		if len(payload.Symbols) > 100 {
			h.sendError(client, "too many symbols (max 100)")
			return
		}
		h.hub.Subscribe(client, payload.Symbols)

	case MessageTypeUnsubscribe:
		var payload SubscribePayload
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			h.sendError(client, "invalid unsubscribe payload")
			return
		}
		h.hub.Unsubscribe(client, payload.Symbols)

	case MessageTypePong:
		// Client responded to ping, nothing to do

	default:
		h.sendError(client, "unknown message type")
	}
}

// sendError sends an error message to the client
func (h *Handler) sendError(client *Client, errMsg string) {
	payload, _ := json.Marshal(map[string]string{"message": errMsg})
	msg, _ := json.Marshal(Message{
		Type:    MessageTypeError,
		Payload: payload,
	})

	select {
	case client.Send <- msg:
	default:
	}
}
