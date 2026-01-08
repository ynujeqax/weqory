import { memo } from 'react'
import { motion } from 'framer-motion'
import { CoinLogo } from '@/components/common/CoinLogo'
import { Sparkline } from '@/components/common/Sparkline'
import { cn, formatPrice, formatPercentage, getPriceChangeColor } from '@/lib/utils'
import type { Coin } from '@/types'

interface TopCoinCardProps {
  coin: Coin
  sparklineData?: number[]
}

function TopCoinCardComponent({ coin, sparklineData = [] }: TopCoinCardProps) {
  const change = coin.priceChange24hPct ?? 0
  const price = coin.currentPrice ?? 0

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className={cn(
        'flex-shrink-0 w-[160px] bg-surface rounded-xl p-3',
        'border border-border-subtle',
        'transition-colors duration-150'
      )}
    >
      {/* Header: Logo + Symbol */}
      <div className="flex items-center gap-2 mb-2">
        <CoinLogo symbol={coin.symbol} name={coin.name} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-body font-semibold text-tg-text truncate">
            {coin.symbol}
          </p>
        </div>
      </div>

      {/* Price */}
      <p className="text-label-lg font-mono font-semibold text-tg-text mb-1">
        {formatPrice(price)}
      </p>

      {/* Change */}
      <p className={cn(
        'text-body-sm font-mono font-semibold mb-2',
        getPriceChangeColor(change)
      )}>
        {formatPercentage(change)}
      </p>

      {/* Sparkline */}
      {sparklineData.length > 0 && (
        <div className="w-full h-8">
          <Sparkline
            data={sparklineData}
            width={136}
            height={32}
            className="opacity-70"
          />
        </div>
      )}
    </motion.div>
  )
}

// Memoize to prevent unnecessary re-renders
export const TopCoinCard = memo(TopCoinCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.coin.id === nextProps.coin.id &&
    prevProps.coin.currentPrice === nextProps.coin.currentPrice &&
    prevProps.coin.priceChange24hPct === nextProps.coin.priceChange24hPct
  )
})
