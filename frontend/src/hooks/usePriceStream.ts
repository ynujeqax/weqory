import { useCallback } from 'react'
import { useWebSocket } from './useWebSocket'
import { usePricesStore } from '@/stores/pricesStore'
import type { PriceUpdate } from '@/types'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws/prices'

export function usePriceStream(symbols: string[]) {
  const { updatePrice, setConnectionStatus } = usePricesStore()

  const handleMessage = useCallback(
    (data: PriceUpdate) => {
      updatePrice(data.symbol, data)
    },
    [updatePrice]
  )

  const { isConnected, send } = useWebSocket<PriceUpdate>(handleMessage, {
    url: WS_URL,
    onOpen: () => {
      setConnectionStatus(true)
      // Subscribe to symbols
      if (symbols.length > 0) {
        send({
          type: 'subscribe',
          symbols,
        })
      }
    },
    onClose: () => {
      setConnectionStatus(false)
    },
    onError: (error) => {
      console.error('Price stream error:', error)
      setConnectionStatus(false)
    },
  })

  // Subscribe/unsubscribe when symbols change
  const subscribe = useCallback(
    (newSymbols: string[]) => {
      if (isConnected && newSymbols.length > 0) {
        send({
          type: 'subscribe',
          symbols: newSymbols,
        })
      }
    },
    [isConnected, send]
  )

  const unsubscribe = useCallback(
    (symbolsToRemove: string[]) => {
      if (isConnected && symbolsToRemove.length > 0) {
        send({
          type: 'unsubscribe',
          symbols: symbolsToRemove,
        })
      }
    },
    [isConnected, send]
  )

  return {
    isConnected,
    subscribe,
    unsubscribe,
  }
}
