import { memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Plus, Check } from 'lucide-react'
import { CoinLogo } from '@/components/common/CoinLogo'
import { Sparkline } from '@/components/common/Sparkline'
import { Button } from '@/components/ui/Button'
import { cn, formatPrice, formatPercentage, getPriceChangeColor } from '@/lib/utils'
import { useTelegram } from '@/hooks/useTelegram'
import type { Coin } from '@/types'

interface MarketCoinCardProps {
  coin: Coin
  isInWatchlist: boolean
  onToggleWatchlist: () => void
  sparklineData?: number[]
  disabled?: boolean
}

function MarketCoinCardComponent({
  coin,
  isInWatchlist,
  onToggleWatchlist,
  sparklineData = [],
  disabled,
}: MarketCoinCardProps) {
  const { hapticFeedback } = useTelegram()

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) {
      hapticFeedback('error')
      return
    }
    onToggleWatchlist()
  }, [disabled, hapticFeedback, onToggleWatchlist])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'bg-surface rounded-lg p-4',
        disabled && 'opacity-50'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        {/* Left: Coin info */}
        <div className="flex items-center gap-3">
          {coin.rank && (
            <span className="text-body-sm text-tg-hint font-mono w-6 text-right">
              {coin.rank}
            </span>
          )}
          <CoinLogo symbol={coin.symbol} name={coin.name} size="sm" />
          <div>
            <p className="text-label font-semibold text-tg-text">
              {coin.symbol}
            </p>
            <p className="text-body-sm text-tg-hint">
              {coin.name}
            </p>
          </div>
        </div>

        {/* Right: Add button */}
        <Button
          variant={isInWatchlist ? 'secondary' : 'ghost'}
          size="sm"
          onClick={handleToggle}
          disabled={disabled}
          className={cn(
            'flex-shrink-0',
            isInWatchlist && 'bg-success/20 text-success hover:bg-success/30'
          )}
        >
          {isInWatchlist ? (
            <Check size={16} />
          ) : (
            <Plus size={16} />
          )}
        </Button>
      </div>

      {/* Bottom: Price, change, sparkline */}
      <div className="flex items-end justify-between">
        <div className="flex-1">
          <p className="text-label font-mono font-semibold text-tg-text mb-1">
            {formatPrice(coin.currentPrice ?? 0)}
          </p>
          <p className={cn(
            'text-body-sm font-mono font-medium',
            getPriceChangeColor(coin.priceChange24hPct ?? 0)
          )}>
            {formatPercentage(coin.priceChange24hPct ?? 0)}
          </p>
        </div>

        {sparklineData.length > 0 && (
          <Sparkline
            data={sparklineData}
            width={80}
            height={32}
            className="opacity-80"
          />
        )}
      </div>
    </motion.div>
  )
}

// Memoize to prevent unnecessary re-renders in virtualized list
export const MarketCoinCard = memo(MarketCoinCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.coin.id === nextProps.coin.id &&
    prevProps.isInWatchlist === nextProps.isInWatchlist &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.coin.currentPrice === nextProps.coin.currentPrice &&
    prevProps.coin.priceChange24hPct === nextProps.coin.priceChange24hPct
  )
})
