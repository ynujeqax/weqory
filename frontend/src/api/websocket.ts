const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080'

export interface PriceUpdate {
  symbol: string
  price: number
  change_24h: number
  volume_24h: number
  timestamp: number
}

export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'price_update' | 'ping' | 'pong' | 'error'
  payload?: unknown
}

type PriceUpdateCallback = (update: PriceUpdate) => void
type ConnectionCallback = () => void
type ErrorCallback = (error: string) => void

class PriceWebSocket {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private subscriptions: Set<string> = new Set()
  private onPriceUpdate: PriceUpdateCallback | null = null
  private onConnect: ConnectionCallback | null = null
  private onDisconnect: ConnectionCallback | null = null
  private onError: ErrorCallback | null = null
  private pingInterval: ReturnType<typeof setInterval> | null = null

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.ws = new WebSocket(`${WS_URL}/ws/prices`)

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this.onConnect?.()

      // Resubscribe to all symbols
      if (this.subscriptions.size > 0) {
        this.send({
          type: 'subscribe',
          payload: { symbols: Array.from(this.subscriptions) },
        })
      }

      // Start ping interval
      this.pingInterval = setInterval(() => {
        this.send({ type: 'ping' })
      }, 30000)
    }

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)

        switch (message.type) {
          case 'price_update':
            if (this.onPriceUpdate && message.payload) {
              this.onPriceUpdate(message.payload as PriceUpdate)
            }
            break
          case 'pong':
            // Server responded to ping
            break
          case 'error':
            if (message.payload && typeof message.payload === 'object' && 'message' in message.payload) {
              this.onError?.((message.payload as { message: string }).message)
            }
            break
        }
      } catch {
        // Invalid message format
      }
    }

    this.ws.onclose = () => {
      this.onDisconnect?.()
      this.cleanup()
      this.attemptReconnect()
    }

    this.ws.onerror = () => {
      this.onError?.('WebSocket connection error')
    }
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.onError?.('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    setTimeout(() => {
      this.connect()
    }, delay)
  }

  private send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  subscribe(symbols: string[]): void {
    symbols.forEach((s) => this.subscriptions.add(s))

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'subscribe',
        payload: { symbols },
      })
    }
  }

  unsubscribe(symbols: string[]): void {
    symbols.forEach((s) => this.subscriptions.delete(s))

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'unsubscribe',
        payload: { symbols },
      })
    }
  }

  setOnPriceUpdate(callback: PriceUpdateCallback): void {
    this.onPriceUpdate = callback
  }

  setOnConnect(callback: ConnectionCallback): void {
    this.onConnect = callback
  }

  setOnDisconnect(callback: ConnectionCallback): void {
    this.onDisconnect = callback
  }

  setOnError(callback: ErrorCallback): void {
    this.onError = callback
  }

  disconnect(): void {
    this.cleanup()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.subscriptions.clear()
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// Export singleton instance
export const priceWebSocket = new PriceWebSocket()
