import { motion } from 'framer-motion'
import { User as UserIcon, AlertTriangle, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn, formatDate } from '@/lib/utils'
import type { User, Plan } from '@/types'

interface UserHeaderProps {
  user: User
}

// Calculate days until expiration
function getDaysUntilExpiration(expiresAt: string): number {
  const now = new Date()
  const expiry = new Date(expiresAt)
  const diffTime = expiry.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

const planColors: Record<Plan, { bg: string; text: string; label: string }> = {
  standard: { bg: 'bg-surface-elevated', text: 'text-tg-hint', label: 'Standard' },
  pro: { bg: 'bg-warning-soft', text: 'text-warning', label: 'Pro' },
  ultimate: { bg: 'bg-success-soft', text: 'text-success', label: 'Ultimate' },
}

export function UserHeader({ user }: UserHeaderProps) {
  const navigate = useNavigate()
  const { firstName, lastName, username, plan, planExpiresAt, createdAt } = user
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const initials = firstName
    ? firstName.charAt(0).toUpperCase() + (lastName ? lastName.charAt(0).toUpperCase() : '')
    : '?'

  const planInfo = planColors[plan]

  // Check if subscription is expiring soon (within 7 days)
  const daysUntilExpiry = planExpiresAt ? getDaysUntilExpiration(planExpiresAt) : null
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 7
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl bg-surface-elevated p-6"
    >
      {/* Glass effect background */}
      <div
        className={cn(
          'absolute inset-0',
          'bg-gradient-to-br from-white/5 via-transparent to-white/5',
          'backdrop-blur-sm'
        )}
      />

      {/* Decorative blur orbs */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-tg-link/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-success/10 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative space-y-4">
        {/* Avatar + Name */}
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-surface-hover flex items-center justify-center border border-white/10">
            <span className="text-headline-lg font-bold text-tg-text">
              {initials}
            </span>
          </div>

          {/* Name + Username */}
          <div className="flex-1 min-w-0">
            <h2 className="text-headline font-semibold text-tg-text truncate">
              {fullName}
            </h2>
            {username && (
              <p className="text-body text-tg-hint truncate">@{username}</p>
            )}
          </div>

          {/* Plan badge */}
          <Badge
            variant={plan === 'ultimate' ? 'success' : plan === 'pro' ? 'warning' : 'neutral'}
            className={cn('font-semibold', planInfo.bg, planInfo.text)}
          >
            {planInfo.label}
          </Badge>
        </div>

        {/* Member since */}
        <div className="flex items-center gap-2 text-body-sm text-tg-hint">
          <UserIcon size={14} />
          <span>Member since {formatDate(createdAt)}</span>
        </div>

        {/* Expiration Warning */}
        {(isExpiringSoon || isExpired) && plan !== 'standard' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'mt-4 p-3 rounded-lg border',
              isExpired
                ? 'bg-error-soft border-error/30'
                : 'bg-warning-soft border-warning/30'
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'p-1.5 rounded-full flex-shrink-0',
                  isExpired ? 'bg-error/20' : 'bg-warning/20'
                )}
              >
                {isExpired ? (
                  <AlertTriangle size={16} className="text-error" />
                ) : (
                  <Clock size={16} className="text-warning" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-label font-medium',
                    isExpired ? 'text-error' : 'text-warning'
                  )}
                >
                  {isExpired
                    ? 'Your subscription has expired'
                    : `Your subscription expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`}
                </p>
                <p className="text-body-sm text-tg-hint mt-0.5">
                  {isExpired
                    ? 'Renew now to keep your premium features'
                    : 'Renew to avoid losing your premium features'}
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/profile/subscription')}
                className="flex-shrink-0"
              >
                Renew
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
