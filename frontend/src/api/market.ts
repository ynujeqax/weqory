import { apiClient } from './client'
import type { Coin } from '@/types'

export interface FearGreedIndex {
  value: number
  classification: string
}

// Raw API response with snake_case
interface CoinApiResponse {
  id: number
  symbol: string
  name: string
  binance_symbol: string
  rank?: number
  current_price?: number
  market_cap?: number
  volume_24h?: number
  price_change_24h_pct?: number
}

interface MarketOverviewApiResponse {
  total_market_cap: number
  total_volume_24h: number
  btc_dominance: number
  eth_dominance: number
  market_cap_change_24h_pct: number
  fear_greed_index: FearGreedIndex
  top_coins: CoinApiResponse[]
}

// Frontend-friendly response with camelCase
export interface MarketOverviewResponse {
  total_market_cap: number
  total_volume_24h: number
  btc_dominance: number
  eth_dominance: number
  market_cap_change_24h_pct: number
  fear_greed_index: FearGreedIndex
  top_coins: Coin[]
}

// Map API coin to frontend Coin type
function mapCoin(coin: CoinApiResponse): Coin {
  return {
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    binanceSymbol: coin.binance_symbol,
    isStablecoin: false,
    rank: coin.rank,
    currentPrice: coin.current_price,
    marketCap: coin.market_cap,
    volume24h: coin.volume_24h,
    priceChange24hPct: coin.price_change_24h_pct,
  }
}

export const marketApi = {
  async getOverview(): Promise<MarketOverviewResponse> {
    const response = await apiClient.get<MarketOverviewApiResponse>('/market/overview')
    const data = response.data

    return {
      ...data,
      top_coins: data.top_coins?.map(mapCoin) ?? [],
    }
  },
}
