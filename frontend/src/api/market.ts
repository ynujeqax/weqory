import { apiClient } from './client'
import type { Coin } from '@/types'

export interface FearGreedIndex {
  value: number
  classification: string
}

export interface MarketOverviewResponse {
  total_market_cap: number
  total_volume_24h: number
  btc_dominance: number
  eth_dominance: number
  market_cap_change_24h_pct: number
  fear_greed_index: FearGreedIndex
  top_coins: Coin[]
}

export const marketApi = {
  async getOverview(): Promise<MarketOverviewResponse> {
    const response = await apiClient.get<MarketOverviewResponse>('/market/overview')
    return response.data
  },
}
