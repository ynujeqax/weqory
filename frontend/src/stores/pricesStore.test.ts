import { describe, it, expect, beforeEach } from 'vitest'
import { usePricesStore } from './pricesStore'
import type { PriceUpdate } from '@/types'

describe('pricesStore', () => {
  beforeEach(() => {
    // Reset store before each test
    usePricesStore.setState({
      prices: new Map(),
      isConnected: false,
    })
  })

  describe('updatePrice', () => {
    it('should add a new price to the store', () => {
      const { updatePrice, prices } = usePricesStore.getState()

      const priceUpdate: PriceUpdate = {
        symbol: 'BTCUSDT',
        price: 50000,
        change24hPct: 2.5,
        volume24h: 1000000,
        updatedAt: '2025-01-07T12:00:00Z',
      }

      updatePrice('BTCUSDT', priceUpdate)

      const newState = usePricesStore.getState()
      expect(newState.prices.size).toBe(1)
      expect(newState.prices.get('BTCUSDT')).toEqual(priceUpdate)
    })

    it('should update an existing price', () => {
      const { updatePrice } = usePricesStore.getState()

      const initialPrice: PriceUpdate = {
        symbol: 'BTCUSDT',
        price: 50000,
        change24hPct: 2.5,
        volume24h: 1000000,
        updatedAt: '2025-01-07T12:00:00Z',
      }

      const updatedPrice: PriceUpdate = {
        symbol: 'BTCUSDT',
        price: 51000,
        change24hPct: 3.0,
        volume24h: 1100000,
        updatedAt: '2025-01-07T12:01:00Z',
      }

      updatePrice('BTCUSDT', initialPrice)
      updatePrice('BTCUSDT', updatedPrice)

      const newState = usePricesStore.getState()
      expect(newState.prices.size).toBe(1)
      expect(newState.prices.get('BTCUSDT')?.price).toBe(51000)
      expect(newState.prices.get('BTCUSDT')?.change24hPct).toBe(3.0)
    })

    it('should handle multiple symbols', () => {
      const { updatePrice } = usePricesStore.getState()

      const btcPrice: PriceUpdate = {
        symbol: 'BTCUSDT',
        price: 50000,
        change24hPct: 2.5,
        volume24h: 1000000,
        updatedAt: '2025-01-07T12:00:00Z',
      }

      const ethPrice: PriceUpdate = {
        symbol: 'ETHUSDT',
        price: 3000,
        change24hPct: 1.5,
        volume24h: 500000,
        updatedAt: '2025-01-07T12:00:00Z',
      }

      updatePrice('BTCUSDT', btcPrice)
      updatePrice('ETHUSDT', ethPrice)

      const newState = usePricesStore.getState()
      expect(newState.prices.size).toBe(2)
      expect(newState.prices.get('BTCUSDT')?.price).toBe(50000)
      expect(newState.prices.get('ETHUSDT')?.price).toBe(3000)
    })
  })

  describe('setPrices', () => {
    it('should replace all prices', () => {
      const { setPrices, updatePrice } = usePricesStore.getState()

      // Add initial price
      updatePrice('BTCUSDT', {
        symbol: 'BTCUSDT',
        price: 50000,
        change24hPct: 2.5,
        volume24h: 1000000,
        updatedAt: '2025-01-07T12:00:00Z',
      })

      // Replace with new prices
      const newPrices = new Map<string, PriceUpdate>()
      newPrices.set('ETHUSDT', {
        symbol: 'ETHUSDT',
        price: 3000,
        change24hPct: 1.5,
        volume24h: 500000,
        updatedAt: '2025-01-07T12:00:00Z',
      })

      setPrices(newPrices)

      const newState = usePricesStore.getState()
      expect(newState.prices.size).toBe(1)
      expect(newState.prices.has('BTCUSDT')).toBe(false)
      expect(newState.prices.has('ETHUSDT')).toBe(true)
    })
  })

  describe('setConnectionStatus', () => {
    it('should update connection status to true', () => {
      const { setConnectionStatus } = usePricesStore.getState()

      setConnectionStatus(true)

      expect(usePricesStore.getState().isConnected).toBe(true)
    })

    it('should update connection status to false', () => {
      const { setConnectionStatus } = usePricesStore.getState()

      setConnectionStatus(true)
      setConnectionStatus(false)

      expect(usePricesStore.getState().isConnected).toBe(false)
    })
  })

  describe('getPrice', () => {
    it('should return price for existing symbol', () => {
      const { updatePrice, getPrice } = usePricesStore.getState()

      const priceUpdate: PriceUpdate = {
        symbol: 'BTCUSDT',
        price: 50000,
        change24hPct: 2.5,
        volume24h: 1000000,
        updatedAt: '2025-01-07T12:00:00Z',
      }

      updatePrice('BTCUSDT', priceUpdate)

      const price = usePricesStore.getState().getPrice('BTCUSDT')
      expect(price).toEqual(priceUpdate)
    })

    it('should return undefined for non-existing symbol', () => {
      const { getPrice } = usePricesStore.getState()

      const price = getPrice('NONEXISTENT')
      expect(price).toBeUndefined()
    })
  })

  describe('clearPrices', () => {
    it('should clear all prices', () => {
      const { updatePrice, clearPrices } = usePricesStore.getState()

      updatePrice('BTCUSDT', {
        symbol: 'BTCUSDT',
        price: 50000,
        change24hPct: 2.5,
        volume24h: 1000000,
        updatedAt: '2025-01-07T12:00:00Z',
      })

      updatePrice('ETHUSDT', {
        symbol: 'ETHUSDT',
        price: 3000,
        change24hPct: 1.5,
        volume24h: 500000,
        updatedAt: '2025-01-07T12:00:00Z',
      })

      clearPrices()

      const newState = usePricesStore.getState()
      expect(newState.prices.size).toBe(0)
    })
  })
})
