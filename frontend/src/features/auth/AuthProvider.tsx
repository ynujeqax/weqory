import { useEffect, useState } from 'react'
import { useTelegram } from '@/hooks/useTelegram'
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/api/client'
import { Spinner } from '@/components/ui/Spinner'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { initData } = useTelegram()
  const { setUser, setLimits, setToken, isAuthenticated } = useAuthStore()
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Skip if already authenticated or no initData
        if (isAuthenticated || !initData) {
          setIsInitializing(false)
          return
        }

        // Validate initData and get user
        const response = await apiClient.post('/auth/telegram', {
          init_data: initData,
        })

        const { user, token: authToken } = response.data

        setUser(user)
        setToken(authToken)
        if (user.limits) {
          setLimits(user.limits)
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
        // Don't throw - let user see error state
      } finally {
        setIsInitializing(false)
      }
    }

    initAuth()
  }, [initData, isAuthenticated, setUser, setToken, setLimits])

  // Show loading screen during initialization
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 text-center">
          <Spinner size="lg" />
          <p className="text-body text-tg-hint">Initializing Weqory...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
