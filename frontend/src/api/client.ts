import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// Request interceptor to add Telegram InitData header
// Backend validates InitData on every request, not JWT tokens
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get Telegram initData directly from WebApp
    // This is available throughout the app session
    const initData = window.Telegram?.WebApp?.initData
    if (initData) {
      config.headers['X-Telegram-Init-Data'] = initData
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error: string; details?: unknown }>) => {
    // Auto-logout on 401 (unauthorized/expired initData)
    // Skip for auth endpoints to prevent logout loops
    const url = error.config?.url || ''
    const isAuthEndpoint = url.includes('/auth') || url.startsWith('auth')

    if (error.response?.status === 401 && !isAuthEndpoint) {
      const authStore = useAuthStore.getState()

      // Get the initData that was used in the failed request
      const requestInitData = error.config?.headers?.['X-Telegram-Init-Data'] as string | undefined
      const currentInitData = window.Telegram?.WebApp?.initData

      // Only logout if:
      // 1. User is authenticated
      // 2. The request was made with the current initData (not a stale request)
      // If request had no initData or different initData, don't logout
      if (authStore.isAuthenticated && currentInitData && requestInitData === currentInitData) {
        // Clear auth state - components will redirect via AuthGuard
        authStore.logout()
      }
    }
    return Promise.reject(error)
  }
)

// Helper function to get error message
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error: string }>
    return axiosError.response?.data?.error || axiosError.message || 'An error occurred'
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}
