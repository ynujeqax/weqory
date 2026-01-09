import { apiClient } from './client'
import type { SubscriptionPlan, Payment, Plan } from '@/types'

// API response types (snake_case from backend)
interface PlansApiResponse {
  plans: Array<{
    name: string
    max_coins: number
    max_alerts: number
    max_notifications: number | null
    history_retention_days: number
    price_monthly?: number
    price_yearly?: number
  }>
}

interface CreateInvoiceApiResponse {
  invoice_link: string
  payment_id: number
}

interface PaymentHistoryApiResponse {
  items: Array<{
    id: number
    plan: string
    period: string
    stars_amount: number
    status: string
    created_at: string
    completed_at?: string
  }>
  total: number
}

// Frontend response types (camelCase)
export interface PlansResponse {
  plans: SubscriptionPlan[]
}

export interface CreateInvoiceResponse {
  invoiceLink: string
  paymentId: number
}

export interface PaymentHistoryResponse {
  items: Payment[]
  total: number
}

// Map backend plan response to frontend type
function mapPlan(plan: PlansApiResponse['plans'][0]): SubscriptionPlan {
  return {
    name: plan.name as Plan,
    maxCoins: plan.max_coins,
    maxAlerts: plan.max_alerts,
    maxNotifications: plan.max_notifications,
    historyRetentionDays: plan.history_retention_days,
    priceMonthly: plan.price_monthly,
    priceYearly: plan.price_yearly,
  }
}

// Map backend payment response to frontend type
function mapPayment(payment: PaymentHistoryApiResponse['items'][0]): Payment {
  return {
    id: payment.id,
    userId: 0, // Not returned by backend
    plan: payment.plan as Plan,
    period: payment.period as 'monthly' | 'yearly',
    starsAmount: payment.stars_amount,
    status: payment.status as Payment['status'],
    createdAt: payment.created_at,
    completedAt: payment.completed_at,
  }
}

export const paymentsApi = {
  /**
   * Get available subscription plans with pricing
   * Public endpoint - no auth required
   */
  async getPlans(): Promise<PlansResponse> {
    const response = await apiClient.get<PlansApiResponse>('/payments/plans')
    return {
      plans: response.data.plans.map(mapPlan),
    }
  },

  /**
   * Create a payment invoice for Telegram Stars
   * Returns invoice link to be opened with Telegram.WebApp.openInvoice()
   */
  async createInvoice(plan: Plan, period: 'monthly' | 'yearly'): Promise<CreateInvoiceResponse> {
    const response = await apiClient.post<CreateInvoiceApiResponse>('/payments/create-invoice', {
      plan,
      period,
    })
    return {
      invoiceLink: response.data.invoice_link,
      paymentId: response.data.payment_id,
    }
  },

  /**
   * Get user's payment history
   */
  async getHistory(limit = 20, offset = 0): Promise<PaymentHistoryResponse> {
    const params = new URLSearchParams()
    if (limit) params.append('limit', String(limit))
    if (offset) params.append('offset', String(offset))

    const queryString = params.toString()
    const url = queryString ? `/payments/history?${queryString}` : '/payments/history'

    const response = await apiClient.get<PaymentHistoryApiResponse>(url)
    return {
      items: response.data.items.map(mapPayment),
      total: response.data.total,
    }
  },
}
