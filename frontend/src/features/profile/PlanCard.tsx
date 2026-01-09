import { motion } from 'framer-motion'
import { Check, Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { Plan } from '@/types'

interface PlanCardProps {
  plan: Plan
  name: string
  priceMonthly?: number
  priceYearly?: number
  features: string[]
  isCurrent?: boolean
  isPopular?: boolean
  isBestValue?: boolean
  billingPeriod: 'monthly' | 'yearly'
  onSelect?: () => void
}

export function PlanCard({
  plan,
  name,
  priceMonthly,
  priceYearly,
  features,
  isCurrent,
  isPopular,
  isBestValue,
  billingPeriod,
  onSelect,
}: PlanCardProps) {
  const price = billingPeriod === 'yearly' ? priceYearly : priceMonthly
  const isFree = !price
  const isUltimate = plan === 'ultimate'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!isCurrent ? { y: -4 } : undefined}
      className={cn(
        'relative overflow-hidden rounded-lg border-2 transition-all',
        isCurrent
          ? 'border-success bg-success-soft'
          : isUltimate
          ? 'border-cyan-400 bg-cyan-500/10'
          : isPopular
          ? 'border-warning bg-surface-elevated'
          : 'border-white/10 bg-surface'
      )}
    >
      {/* Popular/Best Value Badge */}
      {(isPopular || isBestValue) && (
        <div className="absolute top-3 right-3">
          <Badge
            variant={isUltimate ? 'default' : isPopular ? 'warning' : 'success'}
            size="sm"
            className={cn('font-semibold', isUltimate && 'bg-cyan-500 text-white')}
          >
            {isPopular ? 'Most Popular' : 'Best Value'}
          </Badge>
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Plan name */}
        <div>
          <h3 className="text-headline font-semibold text-tg-text">{name}</h3>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1">
          {isFree ? (
            <span className="text-display font-bold text-tg-text">Free</span>
          ) : (
            <>
              <span className="text-display font-bold text-tg-text">{price}</span>
              <span className="text-body text-tg-hint">⭐</span>
              <span className="text-body text-tg-hint">
                /{billingPeriod === 'yearly' ? 'year' : 'month'}
              </span>
            </>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check size={16} className="text-success mt-0.5 flex-shrink-0" />
              <span className="text-body-sm text-tg-text">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <Button
          variant="secondary"
          onClick={onSelect}
          disabled={isCurrent}
          className={cn(
            'w-full',
            !isCurrent && isPopular && 'bg-warning hover:bg-warning/90 text-black',
            !isCurrent && isUltimate && 'bg-cyan-500 hover:bg-cyan-400 text-black'
          )}
        >
          {isCurrent ? 'Current Plan' : isFree ? 'Downgrade' : 'Upgrade'}
        </Button>

        {/* Current plan indicator */}
        {isCurrent && (
          <div className="flex items-center justify-center gap-1.5 text-success">
            <Star size={14} fill="currentColor" />
            <span className="text-label-sm font-medium">Active Plan</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
