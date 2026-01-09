import { useEffect } from 'react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTelegram } from '@/hooks/useTelegram'
import { AppRouter } from '@/app/Router'
import { BottomNav, ErrorBoundary, ToastContainer, OfflineIndicator, UpdateNotification } from '@/components/common'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { PriceStreamProvider } from '@/features/prices/PriceStreamProvider'
import { Spinner } from '@/components/ui/Spinner'
import { useSyncPendingMutations } from '@/api/hooks'

// Component to handle background sync of pending mutations
function OfflineSyncManager() {
  useSyncPendingMutations()
  return null
}

// Main app layout - different for auth vs authenticated pages
function AppLayout() {
  const location = useLocation()
  const isAuthPage = location.pathname === '/auth'

  // Auth page gets full screen without nav or padding
  if (isAuthPage) {
    return (
      <>
        <AppRouter />
        <ToastContainer />
      </>
    )
  }

  // Authenticated pages get full layout with nav, price stream, etc.
  return (
    <PriceStreamProvider>
      <OfflineSyncManager />
      <OfflineIndicator />
      <UpdateNotification />
      <div className="flex flex-col h-screen pt-14 pb-14 w-full max-w-md mx-auto overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <AppRouter />
        </main>
        <BottomNav />
      </div>
      <ToastContainer />
    </PriceStreamProvider>
  )
}

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

export default function App() {
  const { webApp, isReady } = useTelegram()

  useEffect(() => {
    if (webApp && isReady) {
      // Expand the app to full height
      webApp.expand()
      // Enable closing confirmation
      webApp.enableClosingConfirmation()
      // Set header color
      webApp.setHeaderColor('#1C1C1E')
      // Set background color
      webApp.setBackgroundColor('#1C1C1E')
      // Signal that the app is ready
      webApp.ready()
    }
  }, [webApp, isReady])

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AppLayout />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
