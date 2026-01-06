import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice, formatPercentage } from '@/lib/utils'

interface PriceDisplayProps {
  price: number
  change24h?: number
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

const sizeClasses = {
  sm: {
    price: 'text-body',
    change: 'text-label-sm',
    icon: 14,
  },
  md: {
    price: 'text-headline-sm',
    change: 'text-label',
    icon: 16,
  },
  lg: {
    price: 'text-headline',
    change: 'text-label-lg',
    icon: 18,
  },
}

export function PriceDisplay({
  price,
  change24h,
  size = 'md',
  showIcon = true,
  className,
}: PriceDisplayProps) {
  const isPositive = change24h !== undefined && change24h >= 0
  const hasChange = change24h !== undefined

  return (
    <div className={cn('flex flex-col items-end', className)}>
      <span className={cn('font-mono font-semibold text-tg-text', sizeClasses[size].price)}>
        {formatPrice(price)}
      </span>
      {hasChange && (
        <div
          className={cn(
            'flex items-center gap-1 font-medium',
            sizeClasses[size].change,
            isPositive ? 'text-crypto-up' : 'text-crypto-down'
          )}
        >
          {showIcon && (
            <>
              {isPositive ? (
                <TrendingUp size={sizeClasses[size].icon} />
              ) : (
                <TrendingDown size={sizeClasses[size].icon} />
              )}
            </>
          )}
          <span>{formatPercentage(change24h)}</span>
        </div>
      )}
    </div>
  )
}
