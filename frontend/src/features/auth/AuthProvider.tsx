import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/components/ui/Spinner'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { token } = useAuthStore()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Wait for zustand to hydrate from localStorage
    setIsHydrated(true)
  }, [])

  // Show loading screen while hydrating from localStorage
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 text-center">
          <Spinner size="lg" />
          <p className="text-body text-tg-hint">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
