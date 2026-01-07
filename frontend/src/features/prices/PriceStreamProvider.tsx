import { useEffect, useRef, useCallback } from 'react'
import { usePricesStore } from '@/stores/pricesStore'
import { useWatchlist } from '@/api/hooks'
import { useAuthStore } from '@/stores/authStore'
import type { PriceUpdate } from '@/types'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080'

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'price_update' | 'ping' | 'pong' | 'error'
  payload?: PriceUpdate | { symbols: string[] } | { message: string }
}

interface PriceStreamProviderProps {
  children: React.ReactNode
}

export function PriceStreamProvider({ children }: PriceStreamProviderProps) {
  const { token } = useAuthStore()
  const { updatePrice, setConnectionStatus, clearPrices } = usePricesStore()
  const { data: watchlist } = useWatchlist()

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const reconnectAttemptsRef = useRef(0)
  const pingIntervalRef = useRef<ReturnType<typeof setInterval>>()
  const subscribedSymbolsRef = useRef<Set<string>>(new Set())

  const maxReconnectAttempts = 5
  const baseReconnectDelay = 1000

  const cleanup = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = undefined
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = undefined
    }
  }, [])

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  const subscribe = useCallback((symbols: string[]) => {
    if (symbols.length === 0) return

    symbols.forEach(s => subscribedSymbolsRef.current.add(s))

    send({
      type: 'subscribe',
      payload: { symbols },
    })
  }, [send])

  const connect = useCallback(() => {
    if (!token) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(`${WS_URL}/ws/prices`)
    wsRef.current = ws

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0
      setConnectionStatus(true)

      // Resubscribe to all previously subscribed symbols
      if (subscribedSymbolsRef.current.size > 0) {
        send({
          type: 'subscribe',
          payload: { symbols: Array.from(subscribedSymbolsRef.current) },
        })
      }

      // Start ping interval to keep connection alive
      pingIntervalRef.current = setInterval(() => {
        send({ type: 'ping' })
      }, 30000)
    }

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)

        switch (message.type) {
          case 'price_update':
            if (message.payload && 'symbol' in message.payload) {
              const priceData = message.payload as PriceUpdate
              updatePrice(priceData.symbol, priceData)
            }
            break
          case 'pong':
            // Server responded to ping - connection is alive
            break
          case 'error':
            if (message.payload && 'message' in message.payload) {
              console.error('WebSocket error:', (message.payload as { message: string }).message)
            }
            break
        }
      } catch {
        // Invalid message format, ignore
      }
    }

    ws.onclose = () => {
      setConnectionStatus(false)
      cleanup()

      // Attempt reconnection with exponential backoff
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current)
        reconnectAttemptsRef.current++

        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, delay)
      }
    }

    ws.onerror = () => {
      console.error('WebSocket connection error')
    }
  }, [token, setConnectionStatus, send, cleanup, updatePrice])

  const disconnect = useCallback(() => {
    cleanup()
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    subscribedSymbolsRef.current.clear()
    clearPrices()
  }, [cleanup, clearPrices])

  // Connect when token is available
  useEffect(() => {
    if (token) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [token, connect, disconnect])

  // Subscribe to watchlist symbols when watchlist changes
  useEffect(() => {
    if (!watchlist?.items) return

    const symbols = watchlist.items
      .map(item => item.coin.binanceSymbol)
      .filter(Boolean)

    if (symbols.length > 0) {
      subscribe(symbols)
    }
  }, [watchlist?.items, subscribe])

  return <>{children}</>
}
