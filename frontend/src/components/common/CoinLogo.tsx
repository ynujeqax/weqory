import { useState, memo } from 'react'
import { cn } from '@/lib/utils'

interface CoinLogoProps {
  symbol: string
  name?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  lazy?: boolean
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

function CoinLogoComponent({ symbol, name, size = 'md', className, lazy = true }: CoinLogoProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const imageUrl = `https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`
  const fallbackInitial = symbol.charAt(0).toUpperCase()

  if (imageError) {
    return (
      <div
        className={cn(
          'rounded-full bg-surface-elevated flex items-center justify-center',
          'font-semibold text-tg-text',
          sizeClasses[size],
          className
        )}
      >
        {fallbackInitial}
      </div>
    )
  }

  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      {/* Loading placeholder */}
      {!imageLoaded && (
        <div
          className={cn(
            'absolute inset-0 rounded-full bg-surface-elevated animate-pulse',
            sizeClasses[size]
          )}
        />
      )}

      <img
        src={imageUrl}
        alt={name ?? symbol}
        loading={lazy ? 'lazy' : 'eager'}
        onError={() => setImageError(true)}
        onLoad={() => setImageLoaded(true)}
        className={cn(
          'rounded-full object-cover transition-opacity duration-200',
          sizeClasses[size],
          imageLoaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  )
}

// Memoize to prevent unnecessary re-renders
export const CoinLogo = memo(CoinLogoComponent, (prevProps, nextProps) => {
  return prevProps.symbol === nextProps.symbol && prevProps.size === nextProps.size
})
