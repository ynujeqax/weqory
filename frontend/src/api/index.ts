export { apiClient, getErrorMessage } from './client'
export { authApi, type AuthResponse } from './auth'
export { userApi, type UpdateSettingsRequest, type DeleteResponse } from './user'
export {
  watchlistApi,
  type WatchlistItemResponse,
  type WatchlistResponse,
  type AddToWatchlistResponse,
  type RemoveFromWatchlistResponse,
  type AvailableCoinsResponse,
} from './watchlist'
export {
  alertsApi,
  type AlertResponse,
  type AlertsResponse,
  type CreateAlertRequest,
  type UpdateAlertRequest,
} from './alerts'
export {
  historyApi,
  type AlertHistoryItem,
  type HistoryResponse,
} from './history'
export {
  marketApi,
  type FearGreedIndex,
  type MarketOverviewResponse,
  type CategoryCoinsResponse,
} from './market'
export {
  priceWebSocket,
  type PriceUpdate,
  type WebSocketMessage,
} from './websocket'

// Re-export hooks
export {
  queryKeys,
  useUser,
  useUpdateSettings,
  useDeleteWatchlist,
  useDeleteAlerts,
  useDeleteHistory,
  useWatchlist,
  useAvailableCoins,
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useAlerts,
  useCreateAlert,
  useUpdateAlert,
  useDeleteAlert,
  useHistory,
  useMarketOverview,
  useCategoryCoins,
} from './hooks'
