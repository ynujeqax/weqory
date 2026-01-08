import { memo, useCallback } from 'react'
import { Plus, Check } from 'lucide-react'
import { CoinLogo } from '@/components/common/CoinLogo'
import { Sparkline } from '@/components/common/Sparkline'
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
    <div
      className={cn(
        'flex items-center gap-3 py-3 px-4 bg-surface border-b border-border-subtle last:border-b-0',
        'transition-colors duration-150',
        disabled && 'opacity-50'
      )}
    >
      {/* Rank */}
      {coin.rank && (
        <span className="text-body-sm text-tg-hint font-mono w-8 text-right flex-shrink-0">
          {coin.rank}
        </span>
      )}

      {/* Logo + Name */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <CoinLogo symbol={coin.symbol} name={coin.name} size="sm" />
        <div className="min-w-0">
          <p className="text-body font-medium text-tg-text truncate">
            {coin.symbol}
          </p>
        </div>
      </div>

      {/* Sparkline - hidden on small screens */}
      {sparklineData.length > 0 && (
        <div className="hidden xs:block flex-shrink-0">
          <Sparkline
            data={sparklineData}
            width={60}
            height={24}
            className="opacity-60"
          />
        </div>
      )}

      {/* Price + Change */}
      <div className="text-right flex-shrink-0 min-w-[5rem]">
        <p className="text-body-sm font-mono font-medium text-tg-text">
          {formatPrice(coin.currentPrice ?? 0)}
        </p>
        <p className={cn(
          'text-[11px] font-mono font-medium',
          getPriceChangeColor(coin.priceChange24hPct ?? 0)
        )}>
          {formatPercentage(coin.priceChange24hPct ?? 0)}
        </p>
      </div>

      {/* Action button */}
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          'flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center',
          'transition-colors duration-150 touch-feedback',
          isInWatchlist
            ? 'bg-success/20 text-success'
            : 'bg-surface-elevated text-tg-hint hover:bg-surface-hover',
          disabled && 'cursor-not-allowed'
        )}
      >
        {isInWatchlist ? (
          <Check size={14} />
        ) : (
          <Plus size={14} />
        )}
      </button>
    </div>
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
