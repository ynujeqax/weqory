import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userApi, watchlistApi, alertsApi, historyApi, marketApi } from '.'
import type { CreateAlertRequest, UpdateAlertRequest, UpdateSettingsRequest } from '.'

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

// Watchlist hooks
export function useWatchlist() {
  return useQuery({
    queryKey: queryKeys.watchlist,
    queryFn: watchlistApi.getWatchlist,
    staleTime: 30_000, // 30 seconds
  })
}

export function useAvailableCoins(search?: string, limit?: number) {
  return useQuery({
    queryKey: queryKeys.availableCoins(search),
    queryFn: () => watchlistApi.getAvailableCoins(search, limit),
    staleTime: 60_000, // 1 minute
  })
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (coinSymbol: string) => watchlistApi.addToWatchlist(coinSymbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist })
      queryClient.invalidateQueries({ queryKey: queryKeys.user })
    },
  })
}

export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (symbol: string) => watchlistApi.removeFromWatchlist(symbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist })
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts })
    },
  })
}

// Alerts hooks
export function useAlerts() {
  return useQuery({
    queryKey: queryKeys.alerts,
    queryFn: alertsApi.getAlerts,
    staleTime: 30_000, // 30 seconds
  })
}

export function useCreateAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CreateAlertRequest) => alertsApi.createAlert(request),
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
    mutationFn: (id: string) => alertsApi.deleteAlert(id),
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

// Market hooks
export function useMarketOverview() {
  return useQuery({
    queryKey: queryKeys.market,
    queryFn: marketApi.getOverview,
    staleTime: 60_000, // 1 minute
  })
}
