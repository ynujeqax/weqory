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
    // Don't auto-logout on 401 - let components handle it
    // This prevents logout loops during auth flow
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
