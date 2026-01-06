import { apiClient } from './client'
import type { Alert, Coin } from '@/types'

export interface AlertResponse {
  id: number
  coin: Coin
  alert_type: string
  condition_operator: string
  condition_value: number
  condition_timeframe?: string
  is_recurring: boolean
  is_paused: boolean
  periodic_interval?: string
  times_triggered: number
  last_triggered_at?: string
  price_when_created: number
  created_at: string
}

export interface AlertsResponse {
  items: AlertResponse[]
  total: number
  limit: number
  grouped: Record<string, AlertResponse[]>
}

export interface CreateAlertRequest {
  coin_symbol: string
  alert_type: string
  condition_value: number
  condition_timeframe?: string
  is_recurring?: boolean
  periodic_interval?: string
}

export interface UpdateAlertRequest {
  is_paused: boolean
}

export interface SuccessResponse {
  message: string
}

// Convert API response to internal Alert type
function toAlert(response: AlertResponse): Alert {
  return {
    id: response.id.toString(),
    userId: 0, // Not returned from API
    coinId: response.coin.id,
    coin: response.coin,
    alertType: response.alert_type as any,
    conditionOperator: response.condition_operator as any,
    conditionValue: response.condition_value,
    conditionTimeframe: response.condition_timeframe as any,
    isRecurring: response.is_recurring,
    isPaused: response.is_paused,
    periodicInterval: response.periodic_interval as any,
    timesTriggered: response.times_triggered,
    lastTriggeredAt: response.last_triggered_at,
    priceWhenCreated: response.price_when_created,
    createdAt: response.created_at,
    updatedAt: response.created_at,
  }
}

export const alertsApi = {
  async getAlerts(): Promise<{ items: Alert[]; total: number; limit: number; grouped: Record<string, Alert[]> }> {
    const response = await apiClient.get<AlertsResponse>('/alerts')
    return {
      items: response.data.items.map(toAlert),
      total: response.data.total,
      limit: response.data.limit,
      grouped: Object.fromEntries(
        Object.entries(response.data.grouped).map(([key, alerts]) => [key, alerts.map(toAlert)])
      ),
    }
  },

  async createAlert(request: CreateAlertRequest): Promise<Alert> {
    const response = await apiClient.post<AlertResponse>('/alerts', request)
    return toAlert(response.data)
  },

  async updateAlert(id: string, request: UpdateAlertRequest): Promise<Alert> {
    const response = await apiClient.patch<AlertResponse>(`/alerts/${id}/pause`, request)
    return toAlert(response.data)
  },

  async deleteAlert(id: string): Promise<SuccessResponse> {
    const response = await apiClient.delete<SuccessResponse>(`/alerts/${id}`)
    return response.data
  },
}
