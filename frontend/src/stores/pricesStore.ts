import { create } from 'zustand'
import type { PriceUpdate } from '@/types'

interface PricesState {
  prices: Map<string, PriceUpdate>
  isConnected: boolean

  // Actions
  updatePrice: (symbol: string, price: PriceUpdate) => void
  setPrices: (prices: Map<string, PriceUpdate>) => void
  setConnectionStatus: (connected: boolean) => void
  getPrice: (symbol: string) => PriceUpdate | undefined
  clearPrices: () => void
}

export const usePricesStore = create<PricesState>((set, get) => ({
  prices: new Map(),
  isConnected: false,

  updatePrice: (symbol, price) => set((state) => {
    const newPrices = new Map(state.prices)
    newPrices.set(symbol, price)
    return { prices: newPrices }
  }),

  setPrices: (prices) => set({ prices }),

  setConnectionStatus: (connected) => set({ isConnected: connected }),

  getPrice: (symbol) => get().prices.get(symbol),

  clearPrices: () => set({ prices: new Map() }),
}))
