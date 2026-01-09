import { useEffect, useState } from 'react'
import { Spinner } from '@/components/ui/Spinner'
import { useAuthStore } from '@/stores/authStore'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Wait for Zustand persist middleware to actually hydrate from localStorage
    // This is critical - without this, AuthGuard may check isAuthenticated
    // before Zustand loads the saved state, causing false redirects to /auth
    const unsubFinishHydration = useAuthStore.persist.onFinishHydration(() => {
      setIsHydrated(true)
    })

    // Check if already hydrated (in case hydration finished before this effect ran)
    if (useAuthStore.persist.hasHydrated()) {
      setIsHydrated(true)
    }

    return () => {
      unsubFinishHydration()
    }
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
