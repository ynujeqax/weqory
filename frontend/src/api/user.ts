import { apiClient } from './client'
import type { User, UserLimits } from '@/types'

// Backend returns user data with limits embedded
interface BackendUserResponse {
  id: number
  telegram_id: number
  username?: string
  first_name: string
  last_name?: string
  language_code: string
  plan: string
  plan_expires_at?: string
  plan_period?: string
  notifications_used: number
  notifications_reset_at?: string
  notifications_enabled: boolean
  vibration_enabled: boolean
  created_at: string
  last_active_at: string
  limits?: {
    max_coins: number
    max_alerts: number
    max_notifications: number | null
    history_retention_days: number
    coins_used: number
    alerts_used: number
  }
}

// Frontend-friendly response format
export interface UserResponse {
  user: User
  limits: UserLimits
}

export interface UpdateSettingsRequest {
  notifications_enabled?: boolean
  vibration_enabled?: boolean
}

export interface DeleteResponse {
  deleted_count: number
  message: string
}

// Transform backend snake_case to frontend camelCase
function transformUserResponse(data: BackendUserResponse): UserResponse {
  return {
    user: {
      id: data.id,
      telegramId: data.telegram_id,
      username: data.username,
      firstName: data.first_name,
      lastName: data.last_name,
      languageCode: data.language_code,
      plan: data.plan as User['plan'],
      planExpiresAt: data.plan_expires_at,
      planPeriod: data.plan_period as User['planPeriod'],
      notificationsUsed: data.notifications_used,
      notificationsResetAt: data.notifications_reset_at,
      notificationsEnabled: data.notifications_enabled,
      vibrationEnabled: data.vibration_enabled,
      createdAt: data.created_at,
      lastActiveAt: data.last_active_at,
    },
    limits: {
      maxCoins: data.limits?.max_coins ?? 10,
      maxAlerts: data.limits?.max_alerts ?? 5,
      maxNotifications: data.limits?.max_notifications ?? null,
      historyRetentionDays: data.limits?.history_retention_days ?? 7,
      coinsUsed: data.limits?.coins_used ?? 0,
      alertsUsed: data.limits?.alerts_used ?? 0,
    },
  }
}

export const userApi = {
  async getMe(): Promise<UserResponse> {
    const response = await apiClient.get<BackendUserResponse>('/users/me')
    return transformUserResponse(response.data)
  },

  async updateSettings(settings: UpdateSettingsRequest): Promise<User> {
    const response = await apiClient.patch<User>('/users/me/settings', settings)
    return response.data
  },

  async deleteWatchlist(): Promise<DeleteResponse> {
    const response = await apiClient.delete<DeleteResponse>('/users/me/watchlist')
    return response.data
  },

  async deleteAlerts(): Promise<DeleteResponse> {
    const response = await apiClient.delete<DeleteResponse>('/users/me/alerts')
    return response.data
  },

  async deleteHistory(): Promise<DeleteResponse> {
    const response = await apiClient.delete<DeleteResponse>('/users/me/history')
    return response.data
  },
}
