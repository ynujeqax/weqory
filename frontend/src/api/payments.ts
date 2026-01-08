import { apiClient } from './client'

// Plan response from API
export interface SubscriptionPlan {
  name: string
  max_coins: number
  max_alerts: number
  max_notifications: number | null
  history_retention_days: number
  price_monthly: number | null
  price_yearly: number | null
}

export interface PlansResponse {
  plans: SubscriptionPlan[]
}

// Create invoice request/response
export interface CreateInvoiceRequest {
  plan: string
  period: 'monthly' | 'yearly'
}

export interface CreateInvoiceResponse {
  invoice_link: string
  payment_id: number
}

// Payment history
export interface Payment {
  id: number
  plan: string
  period: string
  stars_amount: number
  status: 'pending' | 'completed' | 'refunded' | 'failed'
  created_at: string
  completed_at?: string
}

export interface PaymentHistoryResponse {
  items: Payment[]
  total: number
}

// Normalized plan type for frontend
export interface Plan {
  name: string
  maxCoins: number
  maxAlerts: number
  maxNotifications: number | null
  historyRetentionDays: number
  priceMonthly: number | null
  priceYearly: number | null
}

// Convert API response to internal Plan type
function toPlan(response: SubscriptionPlan): Plan {
  return {
    name: response.name,
    maxCoins: response.max_coins,
    maxAlerts: response.max_alerts,
    maxNotifications: response.max_notifications,
    historyRetentionDays: response.history_retention_days,
    priceMonthly: response.price_monthly,
    priceYearly: response.price_yearly,
  }
}

export const paymentsApi = {
  // Get available subscription plans
  async getPlans(): Promise<Plan[]> {
    const response = await apiClient.get<PlansResponse>('/payments/plans')
    return response.data.plans.map(toPlan)
  },

  // Create an invoice for subscription
  async createInvoice(request: CreateInvoiceRequest): Promise<{ invoiceLink: string; paymentId: number }> {
    const response = await apiClient.post<CreateInvoiceResponse>('/payments/create-invoice', request)
    return {
      invoiceLink: response.data.invoice_link,
      paymentId: response.data.payment_id,
    }
  },

  // Get payment history
  async getPaymentHistory(): Promise<Payment[]> {
    const response = await apiClient.get<PaymentHistoryResponse>('/payments/history')
    return response.data.items
  },
}
