import { create } from 'zustand'
import type { SortField, SortDirection } from '@/features/market'

export type MarketTab = 'all' | 'top100' | 'defi' | 'layer1'

interface MarketState {
  // Filters
  activeTab: MarketTab
  sortField: SortField
  sortDirection: SortDirection

  // Actions
  setActiveTab: (tab: MarketTab) => void
  setSorting: (field: SortField, direction: SortDirection) => void
  resetFilters: () => void
}

const initialState = {
  activeTab: 'all' as MarketTab,
  sortField: 'rank' as SortField,
  sortDirection: 'asc' as SortDirection,
}

export const useMarketStore = create<MarketState>((set) => ({
  ...initialState,

  setActiveTab: (tab) => set({ activeTab: tab }),

  setSorting: (field, direction) => set({
    sortField: field,
    sortDirection: direction,
  }),

  resetFilters: () => set(initialState),
}))
