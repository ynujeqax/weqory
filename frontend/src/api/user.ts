import { apiClient } from './client'
import type { User, UserLimits } from '@/types'

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

export const userApi = {
  async getMe(): Promise<UserResponse> {
    const response = await apiClient.get<UserResponse>('/users/me')
    return response.data
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
