import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useUser, usePlans, useCreateInvoice, useRefreshAfterPayment } from '@/api/hooks'
import { useTelegram } from '@/hooks/useTelegram'
import { useToast } from '@/hooks/useToast'
import { PageHeader } from '@/components/common/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { Spinner } from '@/components/ui/Spinner'
import { PlanCard } from '@/features/profile/PlanCard'
import { PlanComparison } from '@/features/profile/PlanComparison'
import type { Plan } from '@/types'

// Fallback features if API doesn't return them
const planFeatures: Record<Plan, string[]> = {
  standard: [
    '10 coins in watchlist',
    '5 active alerts',
    '100 notifications/month',
    '7 days history',
    'Real-time price updates',
  ],
  pro: [
    '50 coins in watchlist',
    '25 active alerts',
    '500 notifications/month',
    '30 days history',
    'Real-time price updates',
    'Advanced alert types',
  ],
  ultimate: [
    'Unlimited coins',
    'Unlimited alerts',
    'Unlimited notifications',
    'Unlimited history',
    'Real-time price updates',
    'Advanced alert types',
    'Priority support',
  ],
}

// Get dynamic features from plan data
function getPlanFeatures(plan: { name: Plan; maxCoins: number; maxAlerts: number; maxNotifications: number | null; historyRetentionDays: number }): string[] {
  const features: string[] = []

  // Coins
  if (plan.maxCoins >= 1000) {
    features.push('Unlimited coins in watchlist')
  } else {
    features.push(`${plan.maxCoins} coins in watchlist`)
  }

  // Alerts
  if (plan.maxAlerts >= 1000) {
    features.push('Unlimited active alerts')
  } else {
    features.push(`${plan.maxAlerts} active alerts`)
  }

  // Notifications
  if (plan.maxNotifications === null) {
    features.push('Unlimited notifications')
  } else {
    features.push(`${plan.maxNotifications} notifications/month`)
  }

  // History
  if (plan.historyRetentionDays >= 365) {
    features.push('Unlimited history')
  } else {
    features.push(`${plan.historyRetentionDays} days history`)
  }

  // Common features
  features.push('Real-time price updates')

  if (plan.name !== 'standard') {
    features.push('Advanced alert types')
  }

  if (plan.name === 'ultimate') {
    features.push('Priority support')
  }

  return features
}

export default function Subscription() {
  const navigate = useNavigate()
  const { hapticFeedback, openInvoice } = useTelegram()
  const { showToast } = useToast()
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [processingPlan, setProcessingPlan] = useState<Plan | null>(null)

  const { data: userData, isLoading: isUserLoading } = useUser()
  const { data: plansData, isLoading: isPlansLoading } = usePlans()
  const createInvoice = useCreateInvoice()
  const refreshAfterPayment = useRefreshAfterPayment()

  const handleSelectPlan = useCallback(
    async (plan: Plan) => {
      hapticFeedback('medium')

      // Don't process free plan
      if (plan === 'standard') {
        showToast({
          type: 'info',
          message: 'Contact support to downgrade',
        })
        return
      }

      // Prevent double-clicks
      if (processingPlan) return
      setProcessingPlan(plan)

      try {
        // Create invoice
        const result = await createInvoice.mutateAsync({ plan, period: billingPeriod })

        // Open Telegram payment
        const status = await openInvoice(result.invoiceLink)

        switch (status) {
          case 'paid':
            hapticFeedback('success')
            showToast({
              type: 'success',
              message: `Welcome to ${plan.charAt(0).toUpperCase() + plan.slice(1)}!`,
            })
            // Refresh user data to get updated plan
            refreshAfterPayment()
            // Navigate back to profile
            setTimeout(() => navigate('/profile'), 1500)
            break

          case 'cancelled':
            hapticFeedback('light')
            showToast({
              type: 'info',
              message: 'Payment cancelled',
            })
            break

          case 'failed':
            hapticFeedback('error')
            showToast({
              type: 'error',
              message: 'Payment failed. Please try again.',
            })
            break

          case 'pending':
            showToast({
              type: 'info',
              message: 'Payment is being processed...',
            })
            // Still refresh in case it completes
            setTimeout(refreshAfterPayment, 3000)
            break
        }
      } catch (error) {
        hapticFeedback('error')
        showToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to create invoice',
        })
      } finally {
        setProcessingPlan(null)
      }
    },
    [billingPeriod, processingPlan, createInvoice, openInvoice, hapticFeedback, showToast, refreshAfterPayment, navigate]
  )

  const isLoading = isUserLoading || isPlansLoading

  if (isLoading || !userData) {
    return (
      <div className="min-h-screen bg-tg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const { user } = userData
  const currentPlan = user.plan
  const plans = plansData?.plans ?? []

  // Find plan data
  const standardPlan = plans.find(p => p.name === 'standard')
  const proPlan = plans.find(p => p.name === 'pro')
  const ultimatePlan = plans.find(p => p.name === 'ultimate')

  return (
    <div className="min-h-screen bg-tg-bg pb-20">
      {/* Header */}
      <PageHeader
        title="Choose Your Plan"
        leftAction={{
          icon: <ArrowLeft size={20} />,
          onClick: () => {
            hapticFeedback('light')
            navigate('/profile')
          },
        }}
      />

      {/* Billing Period Toggle */}
      <div className="px-4 pt-16 pb-4">
        <Tabs
          tabs={[
            { id: 'monthly', label: 'Monthly' },
            { id: 'yearly', label: 'Yearly (Save 20%)' },
          ]}
          activeTab={billingPeriod}
          onChange={(tab) => {
            hapticFeedback('selection')
            setBillingPeriod(tab as 'monthly' | 'yearly')
          }}
        />
      </div>

      {/* Content */}
      <div className="px-4 space-y-6">
        {/* Plan Cards - Desktop 3 columns, Mobile stacked */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PlanCard
            plan="standard"
            name="Standard"
            features={standardPlan ? getPlanFeatures(standardPlan) : planFeatures.standard}
            isCurrent={currentPlan === 'standard'}
            billingPeriod={billingPeriod}
            onSelect={() => handleSelectPlan('standard')}
          />

          <PlanCard
            plan="pro"
            name="Pro"
            priceMonthly={proPlan?.priceMonthly}
            priceYearly={proPlan?.priceYearly}
            features={proPlan ? getPlanFeatures(proPlan) : planFeatures.pro}
            isCurrent={currentPlan === 'pro'}
            isPopular={true}
            billingPeriod={billingPeriod}
            onSelect={() => handleSelectPlan('pro')}
          />

          <PlanCard
            plan="ultimate"
            name="Ultimate"
            priceMonthly={ultimatePlan?.priceMonthly}
            priceYearly={ultimatePlan?.priceYearly}
            features={ultimatePlan ? getPlanFeatures(ultimatePlan) : planFeatures.ultimate}
            isCurrent={currentPlan === 'ultimate'}
            isBestValue={true}
            billingPeriod={billingPeriod}
            onSelect={() => handleSelectPlan('ultimate')}
          />
        </div>

        {/* Loading overlay when processing payment */}
        {processingPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
          >
            <div className="bg-surface rounded-xl p-6 flex flex-col items-center gap-4">
              <Spinner size="lg" />
              <p className="text-body text-tg-text">Processing payment...</p>
            </div>
          </motion.div>
        )}

        {/* Plan Comparison */}
        <PlanComparison />

        {/* Payment Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-surface rounded-lg p-4 space-y-2"
        >
          <p className="text-label font-semibold text-tg-text">
            Payment Information
          </p>
          <ul className="space-y-1 text-body-sm text-tg-hint">
            <li>Secure payment via Telegram Stars</li>
            <li>Cancel anytime, no questions asked</li>
            <li>7-day money-back guarantee</li>
            <li>Instant activation after payment</li>
          </ul>
        </motion.div>

        {/* Footer Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-body-sm text-tg-hint text-center"
        >
          All prices are in Telegram Stars
        </motion.p>
      </div>
    </div>
  )
}
