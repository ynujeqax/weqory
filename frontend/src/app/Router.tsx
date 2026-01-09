import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Spinner } from '@/components/ui/Spinner'
import { AuthGuard } from '@/features/auth/AuthGuard'
import { PageTransition } from '@/components/common/PageTransition'

// Lazy load pages for better performance
const AuthPage = lazy(() => import('@/pages/AuthPage'))
const WatchlistPage = lazy(() => import('@/pages/Watchlist'))
const AddCoinPage = lazy(() => import('@/pages/Watchlist/AddCoin'))
const AlertsPage = lazy(() => import('@/pages/Alerts'))
const CreateAlertPage = lazy(() => import('@/pages/Alerts/CreateAlert'))
const HistoryPage = lazy(() => import('@/pages/History'))
const MarketPage = lazy(() => import('@/pages/Market'))
const ProfilePage = lazy(() => import('@/pages/Profile'))
const SubscriptionPage = lazy(() => import('@/pages/Profile/Subscription'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Spinner size="lg" />
    </div>
  )
}

export function AppRouter() {
  const location = useLocation()

  return (
    <AnimatePresence mode="popLayout">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          {/* Public routes */}
          <Route path="/auth" element={<PageTransition><AuthPage /></PageTransition>} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <AuthGuard>
                <PageTransition><WatchlistPage /></PageTransition>
              </AuthGuard>
            }
          />
          <Route
            path="/add-coin"
            element={
              <AuthGuard>
                <PageTransition><AddCoinPage /></PageTransition>
              </AuthGuard>
            }
          />
          <Route
            path="/alerts"
            element={
              <AuthGuard>
                <PageTransition><AlertsPage /></PageTransition>
              </AuthGuard>
            }
          />
          <Route
            path="/alerts/create"
            element={
              <AuthGuard>
                <PageTransition><CreateAlertPage /></PageTransition>
              </AuthGuard>
            }
          />
          <Route
            path="/history"
            element={
              <AuthGuard>
                <PageTransition><HistoryPage /></PageTransition>
              </AuthGuard>
            }
          />
          <Route
            path="/market"
            element={
              <AuthGuard>
                <PageTransition><MarketPage /></PageTransition>
              </AuthGuard>
            }
          />
          <Route
            path="/profile"
            element={
              <AuthGuard>
                <PageTransition><ProfilePage /></PageTransition>
              </AuthGuard>
            }
          />
          <Route
            path="/subscription"
            element={
              <AuthGuard>
                <PageTransition><SubscriptionPage /></PageTransition>
              </AuthGuard>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  )
}
