import { apiClient } from './client'
import type { User } from '@/types'

export interface AuthResponse {
  user: User
  token: string
}

export const authApi = {
  async authenticate(initData: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/telegram', {
      init_data: initData,
    })
    return response.data
  },
}
