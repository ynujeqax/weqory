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

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error: string; details?: unknown }>) => {
    // Auto-logout on 401 (unauthorized/expired token)
    // Skip for auth endpoints to prevent logout loops
    const url = error.config?.url || ''
    const isAuthEndpoint = url.includes('/auth') || url.startsWith('auth')

    if (error.response?.status === 401 && !isAuthEndpoint) {
      const authStore = useAuthStore.getState()
      const currentToken = authStore.token

      // Get the token that was used in the failed request
      const requestAuthHeader = error.config?.headers?.Authorization as string | undefined
      const requestToken = requestAuthHeader?.replace('Bearer ', '')

      // Only logout if:
      // 1. User is authenticated
      // 2. The request was made with the current token (not a stale request)
      // If request had no token or different token, it's a stale request - don't logout
      if (authStore.isAuthenticated && currentToken && requestToken === currentToken) {
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
