import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTelegram } from '@/hooks/useTelegram'
import { AppRouter } from '@/app/Router'
import { BottomNav, ErrorBoundary, ToastContainer, OfflineIndicator } from '@/components/common'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { PriceStreamProvider } from '@/features/prices/PriceStreamProvider'
import { Spinner } from '@/components/ui/Spinner'

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
            <PriceStreamProvider>
              <OfflineIndicator />
              <div className="flex flex-col h-screen pt-14 pb-14 w-full max-w-md mx-auto overflow-hidden">
                <main className="flex-1 overflow-y-auto">
                  <AppRouter />
                </main>
                <BottomNav />
              </div>
              <ToastContainer />
            </PriceStreamProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
