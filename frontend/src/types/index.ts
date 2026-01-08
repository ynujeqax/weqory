// User types
export interface User {
  id: number
  telegramId: number
  username?: string
  firstName: string
  lastName?: string
  languageCode: string
  plan: Plan
  planExpiresAt?: string
  planPeriod?: 'monthly' | 'yearly'
  notificationsUsed: number
  notificationsResetAt?: string
  notificationsEnabled: boolean
  vibrationEnabled: boolean
  createdAt: string
  lastActiveAt: string
}

export interface UserLimits {
  maxCoins: number
  maxAlerts: number
  maxNotifications: number | null
  historyRetentionDays: number
  coinsUsed: number
  alertsUsed: number
}

export type Plan = 'standard' | 'pro' | 'ultimate'

// Coin types
export interface Coin {
  id: number
  symbol: string
  name: string
  binanceSymbol: string
  isStablecoin: boolean
  rank?: number
  currentPrice?: number
  marketCap?: number
  volume24h?: number
  priceChange24hPct?: number
  lastUpdated?: string
}

// Watchlist types
export interface WatchlistItem {
  id: number
  userId: number
  coinId: number
  coin: Coin
  alertsCount: number
  createdAt: string
}

// Alert types
export type AlertType =
  | 'PRICE_ABOVE'
  | 'PRICE_BELOW'
  | 'PRICE_CHANGE_PCT'
  | 'PERIODIC'
  | 'VOLUME_SPIKE'
  | 'VOLUME_CHANGE_PCT'
  | 'MARKET_CAP_ABOVE'
  | 'MARKET_CAP_BELOW'

export type ConditionOperator = 'above' | 'below' | 'change'

export type Timeframe = '5m' | '15m' | '30m' | '1h' | '4h' | '24h'

export interface Alert {
  id: string
  userId: number
  coinId: number
  coin: Coin
  alertType: AlertType
  conditionOperator: ConditionOperator
  conditionValue: number
  conditionTimeframe?: Timeframe
  isRecurring: boolean
  isPaused: boolean
  periodicInterval?: Timeframe
  timesTriggered: number
  lastTriggeredAt?: string
  priceWhenCreated?: number
  createdAt: string
  updatedAt: string
}

export interface CreateAlertDTO {
  coinSymbol: string
  alertType: AlertType
  conditionValue: number
  conditionTimeframe?: Timeframe
  isRecurring: boolean
  periodicInterval?: Timeframe
}

// Alert History types
export interface AlertHistory {
  id: number
  userId: number
  alertId?: number
  coinId: number
  coin: Pick<Coin, 'symbol' | 'name'>
  alertType: AlertType
  conditionOperator: ConditionOperator
  conditionValue: number
  conditionTimeframe?: Timeframe
  triggeredPrice: number
  triggeredAt: string
  notificationSent: boolean
  notificationError?: string
}

// Market types
export interface MarketOverview {
  totalMarketCap: number
  totalVolume24h: number
  btcDominance: number
  ethDominance: number
  marketCapChange24hPct: number
  fearGreedIndex: {
    value: number
    classification: string
  }
  topCoins: Coin[]
}

// Payment types
export interface SubscriptionPlan {
  name: Plan
  maxCoins: number
  maxAlerts: number
  maxNotifications: number | null
  historyRetentionDays: number
  priceMonthly?: number
  priceYearly?: number
}

export interface Payment {
  id: number
  userId: number
  telegramPaymentId?: string
  plan: Plan
  period: 'monthly' | 'yearly'
  starsAmount: number
  status: 'pending' | 'completed' | 'refunded' | 'failed'
  createdAt: string
  completedAt?: string
}

// API response types
export interface ApiResponse<T> {
  data: T
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

// Price update (WebSocket)
export interface PriceUpdate {
  symbol: string
  price: number
  change24hPct: number
  volume24h: number
  updatedAt: string
}
