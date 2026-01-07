import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { userApi, watchlistApi, alertsApi, historyApi, marketApi } from '.'
import type { CreateAlertRequest, UpdateAlertRequest, UpdateSettingsRequest, WatchlistResponse, AvailableCoinsResponse, MarketOverviewResponse } from '.'
import { offlineDB } from '@/lib/offlineDB'
import type { Alert } from '@/types'

// Query keys
export const queryKeys = {
  user: ['user'] as const,
  watchlist: ['watchlist'] as const,
  availableCoins: (search?: string) => ['availableCoins', search] as const,
  alerts: ['alerts'] as const,
  history: (limit?: number, offset?: number) => ['history', limit, offset] as const,
  market: ['market'] as const,
}

// User hooks
export function useUser() {
  return useQuery({
    queryKey: queryKeys.user,
    queryFn: userApi.getMe,
    staleTime: 60_000, // 1 minute
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: UpdateSettingsRequest) => userApi.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user })
    },
  })
}

export function useDeleteWatchlist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.deleteWatchlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist })
      queryClient.invalidateQueries({ queryKey: queryKeys.user })
      // Clear offline storage
      offlineDB.saveWatchlist([])
    },
  })
}

export function useDeleteAlerts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.deleteAlerts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts })
      queryClient.invalidateQueries({ queryKey: queryKeys.user })
      // Clear offline storage
      offlineDB.saveAlerts([])
    },
  })
}

export function useDeleteHistory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.deleteHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.history() })
    },
  })
}

// Watchlist hooks with offline support
export function useWatchlist() {
  const query = useQuery({
    queryKey: queryKeys.watchlist,
    queryFn: async (): Promise<WatchlistResponse> => {
      try {
        const data = await watchlistApi.getWatchlist()
        // Save to IndexedDB for offline access
        offlineDB.saveWatchlist(data.items)
        return data
      } catch (error) {
        // If offline, try to load from IndexedDB
        if (!navigator.onLine) {
          const cached = await offlineDB.getWatchlist<WatchlistResponse['items'][0]>()
          if (cached.length > 0) {
            return { items: cached, total: cached.length, limit: 100 }
          }
        }
        throw error
      }
    },
    staleTime: 30_000, // 30 seconds
  })

  return query
}

export function useAvailableCoins(search?: string, limit?: number) {
  const query = useQuery({
    queryKey: queryKeys.availableCoins(search),
    queryFn: async (): Promise<AvailableCoinsResponse> => {
      try {
        const data = await watchlistApi.getAvailableCoins(search, limit)
        // Cache coins for offline search (only on initial load without search)
        if (!search && data.coins) {
          offlineDB.saveCoins(data.coins)
        }
        return data
      } catch (error) {
        // If offline, search in cached coins
        if (!navigator.onLine) {
          const cached = await offlineDB.getCoins<AvailableCoinsResponse['coins'][0]>()
          if (cached.length > 0) {
            let filtered = cached
            if (search) {
              const searchLower = search.toLowerCase()
              filtered = cached.filter(
                (coin) =>
                  coin.symbol.toLowerCase().includes(searchLower) ||
                  coin.name.toLowerCase().includes(searchLower)
              )
            }
            return { coins: filtered.slice(0, limit || 50) }
          }
        }
        throw error
      }
    },
    staleTime: 60_000, // 1 minute
  })

  return query
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (coinSymbol: string) => {
      if (!navigator.onLine) {
        // Queue for background sync
        await offlineDB.addPendingMutation({
          type: 'add-watchlist',
          data: { coinSymbol },
        })
        throw new Error('You are offline. This action will be synced when you are back online.')
      }
      return watchlistApi.addToWatchlist(coinSymbol)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist })
      queryClient.invalidateQueries({ queryKey: queryKeys.user })
    },
  })
}

export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (symbol: string) => {
      if (!navigator.onLine) {
        // Queue for background sync
        await offlineDB.addPendingMutation({
          type: 'remove-watchlist',
          data: { symbol },
        })
        throw new Error('You are offline. This action will be synced when you are back online.')
      }
      return watchlistApi.removeFromWatchlist(symbol)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist })
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts })
    },
  })
}

// Alerts response type
type AlertsResponseType = { items: Alert[]; total: number; limit: number; grouped: Record<string, Alert[]> }

// Alerts hooks with offline support
export function useAlerts() {
  const query = useQuery({
    queryKey: queryKeys.alerts,
    queryFn: async (): Promise<AlertsResponseType> => {
      try {
        const data = await alertsApi.getAlerts()
        // Save to IndexedDB for offline access
        offlineDB.saveAlerts(data.items)
        return data
      } catch (error) {
        // If offline, try to load from IndexedDB
        if (!navigator.onLine) {
          const cached = await offlineDB.getAlerts<Alert>()
          if (cached.length > 0) {
            // Group alerts by coin symbol
            const grouped: Record<string, Alert[]> = {}
            for (const alert of cached) {
              const symbol = alert.coin.symbol
              if (!grouped[symbol]) grouped[symbol] = []
              grouped[symbol].push(alert)
            }
            return { items: cached, total: cached.length, limit: 100, grouped }
          }
        }
        throw error
      }
    },
    staleTime: 30_000, // 30 seconds
  })

  return query
}

export function useCreateAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: CreateAlertRequest) => {
      if (!navigator.onLine) {
        // Queue for background sync
        await offlineDB.addPendingMutation({
          type: 'create-alert',
          data: request,
        })
        throw new Error('You are offline. This alert will be created when you are back online.')
      }
      return alertsApi.createAlert(request)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts })
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist })
      queryClient.invalidateQueries({ queryKey: queryKeys.user })
    },
  })
}

export function useUpdateAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...request }: { id: string } & UpdateAlertRequest) =>
      alertsApi.updateAlert(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts })
    },
  })
}

export function useDeleteAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!navigator.onLine) {
        // Queue for background sync
        await offlineDB.addPendingMutation({
          type: 'delete-alert',
          data: { id },
        })
        throw new Error('You are offline. This action will be synced when you are back online.')
      }
      return alertsApi.deleteAlert(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts })
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist })
      queryClient.invalidateQueries({ queryKey: queryKeys.user })
    },
  })
}

// History hooks
export function useHistory(limit?: number, offset?: number) {
  return useQuery({
    queryKey: queryKeys.history(limit, offset),
    queryFn: () => historyApi.getHistory(limit, offset),
    staleTime: 60_000, // 1 minute
  })
}

// Market hooks with offline support
export function useMarketOverview() {
  const query = useQuery({
    queryKey: queryKeys.market,
    queryFn: async (): Promise<MarketOverviewResponse> => {
      try {
        const data = await marketApi.getOverview()
        // Save to IndexedDB for offline access
        offlineDB.saveMarketData({ key: 'overview', data, timestamp: Date.now() })
        return data
      } catch (error) {
        // If offline, try to load from IndexedDB
        if (!navigator.onLine) {
          const cached = await offlineDB.getMarketData<{ key: string; data: MarketOverviewResponse; timestamp: number }>('overview')
          if (cached) {
            return cached.data
          }
        }
        throw error
      }
    },
    staleTime: 60_000, // 1 minute
  })

  return query
}

// Hook to sync pending mutations when back online
export function useSyncPendingMutations() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const handleOnline = async () => {
      const pending = await offlineDB.getPendingMutations()

      for (const mutation of pending) {
        try {
          switch (mutation.type) {
            case 'create-alert':
              await alertsApi.createAlert(mutation.data as CreateAlertRequest)
              break
            case 'delete-alert':
              await alertsApi.deleteAlert((mutation.data as { id: string }).id)
              break
            case 'add-watchlist':
              await watchlistApi.addToWatchlist((mutation.data as { coinSymbol: string }).coinSymbol)
              break
            case 'remove-watchlist':
              await watchlistApi.removeFromWatchlist((mutation.data as { symbol: string }).symbol)
              break
          }

          if (mutation.id) {
            await offlineDB.clearPendingMutation(mutation.id)
          }
        } catch (error) {
          console.error('[Sync] Failed to sync mutation:', mutation, error)
        }
      }

      // Invalidate all queries to refresh data
      if (pending.length > 0) {
        queryClient.invalidateQueries()
      }
    }

    window.addEventListener('online', handleOnline)

    // Also try to sync on mount if online
    if (navigator.onLine) {
      handleOnline()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [queryClient])
}
