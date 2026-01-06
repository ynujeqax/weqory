import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  current: number
  max: number | null
  showLabel?: boolean
  variant?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
}

export function ProgressBar({
  current,
  max,
  showLabel = true,
  variant = 'default',
  className,
}: ProgressBarProps) {
  const isUnlimited = max === null
  const percentage = isUnlimited ? 0 : Math.min((current / max) * 100, 100)

  const getVariant = (): 'success' | 'warning' | 'danger' => {
    if (variant !== 'default') return variant
    if (isUnlimited) return 'success'
    if (percentage >= 90) return 'danger'
    if (percentage >= 70) return 'warning'
    return 'success'
  }

  const finalVariant = getVariant()

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-label-sm">
          <span className="text-tg-hint">
            {current} {isUnlimited ? 'used' : `/ ${max}`}
          </span>
          {!isUnlimited && (
            <span
              className={cn({
                'text-success': finalVariant === 'success',
                'text-warning': finalVariant === 'warning',
                'text-danger': finalVariant === 'danger',
              })}
            >
              {percentage.toFixed(0)}%
            </span>
          )}
        </div>
      )}

      <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
        {isUnlimited ? (
          <div className="h-full bg-success rounded-full" />
        ) : (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={cn('h-full rounded-full', {
              'bg-success': finalVariant === 'success',
              'bg-warning': finalVariant === 'warning',
              'bg-danger': finalVariant === 'danger',
            })}
          />
        )}
      </div>
    </div>
  )
}
