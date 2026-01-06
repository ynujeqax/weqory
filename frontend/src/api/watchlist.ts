import { apiClient } from './client'
import type { Coin, WatchlistItem } from '@/types'

export interface WatchlistItemResponse {
  id: number
  coin: Coin
  alerts_count: number
  created_at: string
}

export interface WatchlistResponse {
  items: WatchlistItem[]
  total: number
  limit: number
}

export interface AddToWatchlistResponse {
  id: number
  coin: Coin
  added_at: string
}

export interface RemoveFromWatchlistResponse {
  deleted_alerts_count: number
}

export interface AvailableCoinsResponse {
  coins: Coin[]
}

// Helper to convert API response to internal type
function toWatchlistItem(response: WatchlistItemResponse): WatchlistItem {
  return {
    id: response.id,
    userId: 0, // Not returned from API
    coinId: response.coin.id,
    coin: response.coin,
    alertsCount: response.alerts_count,
    createdAt: response.created_at,
  }
}

interface WatchlistApiResponse {
  items: WatchlistItemResponse[]
  total: number
  limit: number
}

export const watchlistApi = {
  async getWatchlist(): Promise<WatchlistResponse> {
    const response = await apiClient.get<WatchlistApiResponse>('/watchlist')
    return {
      ...response.data,
      items: response.data.items.map(toWatchlistItem),
    }
  },

  async addToWatchlist(coinSymbol: string): Promise<AddToWatchlistResponse> {
    const response = await apiClient.post<AddToWatchlistResponse>('/watchlist', {
      coin_symbol: coinSymbol,
    })
    return response.data
  },

  async removeFromWatchlist(symbol: string): Promise<RemoveFromWatchlistResponse> {
    const response = await apiClient.delete<RemoveFromWatchlistResponse>(`/watchlist/${symbol}`)
    return response.data
  },

  async getAvailableCoins(search?: string, limit?: number): Promise<AvailableCoinsResponse> {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (limit) params.append('limit', limit.toString())

    // Use public endpoint for coins list
    const response = await apiClient.get<AvailableCoinsResponse>('/coins', { params })
    return response.data
  },
}
