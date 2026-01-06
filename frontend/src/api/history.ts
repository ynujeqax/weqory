import { apiClient } from './client'
import type { Coin } from '@/types'

export interface AlertHistoryItem {
  id: number
  coin: Coin
  alert_type: string
  condition_operator: string
  condition_value: number
  condition_timeframe?: string
  triggered_price: number
  triggered_at: string
}

export interface HistoryResponse {
  items: AlertHistoryItem[]
  total: number
  retention_days: number
}

export const historyApi = {
  async getHistory(limit?: number, offset?: number): Promise<HistoryResponse> {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit.toString())
    if (offset) params.append('offset', offset.toString())

    const response = await apiClient.get<HistoryResponse>('/history', { params })
    return response.data
  },
}
