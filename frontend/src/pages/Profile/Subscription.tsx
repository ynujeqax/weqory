import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useUser, usePlans, useCreateInvoice } from '@/api/hooks'
import { useTelegram } from '@/hooks/useTelegram'
import { useToast } from '@/hooks/useToast'
import { Tabs } from '@/components/ui/Tabs'
import { Spinner } from '@/components/ui/Spinner'
import { PlanCard } from '@/features/profile/PlanCard'
import { PlanComparison } from '@/features/profile/PlanComparison'
import { getErrorMessage } from '@/api/client'
import type { Plan as PlanType } from '@/types'

const planFeatures = {
  standard: [
    '3 coins in watchlist',
    '6 active alerts',
    '18 notifications/month',
    '1 day history',
    'Real-time price updates',
  ],
  pro: [
    '9 coins in watchlist',
    '18 active alerts',
    '162 notifications/month',
    '7 days history',
    'Real-time price updates',
    'Advanced alert types',
  ],
  ultimate: [
    '27 coins in watchlist',
    '54 active alerts',
    'Unlimited notifications',
    '30 days history',
    'Real-time price updates',
    'Advanced alert types',
    'Priority support',
  ],
}

export default function Subscription() {
  const navigate = useNavigate()
  const { hapticFeedback, showAlert } = useTelegram()
  const { showToast } = useToast()
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)

  const { data: userData, isLoading: userLoading, refetch: refetchUser } = useUser()
  const { data: plans, isLoading: plansLoading } = usePlans()
  const createInvoice = useCreateInvoice()

  const handleSelectPlan = useCallback(
    async (plan: PlanType) => {
      hapticFeedback('medium')

      // Can't purchase standard plan
      if (plan === 'standard') {
        await showAlert('Standard is the free plan. Your subscription will downgrade automatically when it expires.')
        return
      }

      // Check if Telegram WebApp is available
      const webApp = window.Telegram?.WebApp
      if (!webApp) {
        showToast({
          type: 'error',
          message: 'Please open this app in Telegram',
        })
        return
      }

      setProcessingPlan(plan)

      try {
        // Create invoice via API
        const { invoiceLink } = await createInvoice.mutateAsync({
          plan,
          period: billingPeriod,
        })

        // Open invoice in Telegram
        webApp.openInvoice(invoiceLink, (status) => {
          setProcessingPlan(null)

          if (status === 'paid') {
            hapticFeedback('success')
            showToast({
              type: 'success',
              message: 'Payment successful! Your plan is now active.',
            })
            // Refresh user data to get updated plan
            refetchUser()
          } else if (status === 'cancelled') {
            showToast({
              type: 'info',
              message: 'Payment cancelled',
            })
          } else if (status === 'failed') {
            showToast({
              type: 'error',
              message: 'Payment failed. Please try again.',
            })
          }
        })
      } catch (error) {
        setProcessingPlan(null)
        showToast({
          type: 'error',
          message: getErrorMessage(error),
        })
      }
    },
    [hapticFeedback, showAlert, showToast, billingPeriod, createInvoice, refetchUser]
  )

  if (userLoading || !userData || plansLoading) {
    return (
      <div className="min-h-screen bg-tg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const { user } = userData
  const currentPlan = user.plan

  // Get prices from API plans
  const getPlanPrices = (planName: string) => {
    const apiPlan = plans?.find(p => p.name === planName)
    return {
      priceMonthly: apiPlan?.priceMonthly ?? undefined,
      priceYearly: apiPlan?.priceYearly ?? undefined,
    }
  }

  return (
    <div className="min-h-screen bg-tg-bg pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 bg-tg-bg/80 backdrop-blur-sm border-b border-white/5 px-4 py-4"
      >
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => {
              hapticFeedback('light')
              navigate('/profile')
            }}
            className="p-2 -ml-2 rounded-lg hover:bg-surface transition-colors"
          >
            <ArrowLeft size={20} className="text-tg-text" />
          </button>
          <h1 className="text-display font-bold text-tg-text">Choose Your Plan</h1>
        </div>

        {/* Billing Period Toggle */}
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
      </motion.div>

      {/* Content */}
      <div className="px-4 pt-6 space-y-6">
        {/* Plan Cards - Desktop 3 columns, Mobile stacked */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PlanCard
            plan="standard"
            name="Standard"
            features={planFeatures.standard}
            isCurrent={currentPlan === 'standard'}
            billingPeriod={billingPeriod}
            onSelect={() => handleSelectPlan('standard')}
            isLoading={processingPlan === 'standard'}
          />

          <PlanCard
            plan="pro"
            name="Pro"
            {...getPlanPrices('pro')}
            features={planFeatures.pro}
            isCurrent={currentPlan === 'pro'}
            isPopular={true}
            billingPeriod={billingPeriod}
            onSelect={() => handleSelectPlan('pro')}
            isLoading={processingPlan === 'pro'}
          />

          <PlanCard
            plan="ultimate"
            name="Ultimate"
            {...getPlanPrices('ultimate')}
            features={planFeatures.ultimate}
            isCurrent={currentPlan === 'ultimate'}
            isBestValue={true}
            billingPeriod={billingPeriod}
            onSelect={() => handleSelectPlan('ultimate')}
            isLoading={processingPlan === 'ultimate'}
          />
        </div>

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
            <li>• Secure payment via Telegram Stars</li>
            <li>• Cancel anytime, no questions asked</li>
            <li>• 7-day money-back guarantee</li>
            <li>• Instant activation after payment</li>
          </ul>
        </motion.div>

        {/* Expiration info for paid plans */}
        {user.planExpiresAt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="bg-surface rounded-lg p-4"
          >
            <p className="text-label font-semibold text-tg-text">
              Current Subscription
            </p>
            <p className="text-body-sm text-tg-hint mt-1">
              Your {user.plan} plan expires on{' '}
              <span className="text-tg-text font-medium">
                {new Date(user.planExpiresAt).toLocaleDateString()}
              </span>
            </p>
          </motion.div>
        )}

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
