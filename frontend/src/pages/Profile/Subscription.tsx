import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useUser } from '@/api/hooks'
import { useTelegram } from '@/hooks/useTelegram'
import { useToast } from '@/hooks/useToast'
import { Tabs } from '@/components/ui/Tabs'
import { Spinner } from '@/components/ui/Spinner'
import { PlanCard } from '@/features/profile/PlanCard'
import { PlanComparison } from '@/features/profile/PlanComparison'
import type { Plan } from '@/types'

const planFeatures = {
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

export default function Subscription() {
  const navigate = useNavigate()
  const { hapticFeedback, showAlert } = useTelegram()
  const { showToast } = useToast()
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')

  const { data: userData, isLoading } = useUser()

  const handleSelectPlan = useCallback(
    async (_plan: Plan) => {
      hapticFeedback('medium')

      // Show coming soon message for now
      await showAlert('Payment integration coming soon! This will use Telegram Stars for secure in-app purchases.')

      showToast({
        type: 'info',
        message: 'Payment feature coming soon',
      })
    },
    [hapticFeedback, showAlert, showToast]
  )

  if (isLoading || !userData) {
    return (
      <div className="min-h-screen bg-tg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const { user } = userData
  const currentPlan = user.plan

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
          />

          <PlanCard
            plan="pro"
            name="Pro"
            priceMonthly={149}
            priceYearly={1249}
            features={planFeatures.pro}
            isCurrent={currentPlan === 'pro'}
            isPopular={true}
            billingPeriod={billingPeriod}
            onSelect={() => handleSelectPlan('pro')}
          />

          <PlanCard
            plan="ultimate"
            name="Ultimate"
            priceMonthly={349}
            priceYearly={2999}
            features={planFeatures.ultimate}
            isCurrent={currentPlan === 'ultimate'}
            isBestValue={true}
            billingPeriod={billingPeriod}
            onSelect={() => handleSelectPlan('ultimate')}
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

        {/* Footer Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-body-sm text-tg-hint text-center"
        >
          All prices are in Telegram Stars (⭐)
        </motion.p>
      </div>
    </div>
  )
}
