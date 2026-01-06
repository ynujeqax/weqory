import { memo } from 'react'
import { motion } from 'framer-motion'
import { Bell } from 'lucide-react'
import { CoinLogo } from '@/components/common/CoinLogo'
import { Sparkline } from '@/components/common/Sparkline'
import { cn, formatPrice, formatPercentage, formatLargeNumber, getPriceChangeColor } from '@/lib/utils'
import type { WatchlistItem, PriceUpdate } from '@/types'

interface WatchlistCardProps {
  item: WatchlistItem
  price?: PriceUpdate
  sparklineData?: number[]
  onClick: () => void
}

function WatchlistCardComponent({ item, price, sparklineData = [], onClick }: WatchlistCardProps) {
  const { coin, alertsCount } = item
  const currentPrice = price?.price ?? coin.currentPrice ?? 0
  const priceChange = price?.change24hPct ?? coin.priceChange24hPct ?? 0
  const volume = price?.volume24h ?? coin.volume24h ?? 0

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full bg-surface rounded-lg p-4 touch-feedback"
    >
      <div className="flex items-center justify-between mb-3">
        {/* Left: Coin info */}
        <div className="flex items-center gap-3">
          <CoinLogo symbol={coin.symbol} name={coin.name} size="md" />
          <div className="text-left">
            <div className="flex items-center gap-2">
              <p className="text-label font-semibold text-tg-text">
                {coin.symbol}
              </p>
              {alertsCount > 0 && (
                <div className="flex items-center gap-1 text-tg-hint">
                  <Bell size={12} />
                  <span className="text-[10px] font-medium">{alertsCount}</span>
                </div>
              )}
            </div>
            <p className="text-body-sm text-tg-hint">
              {coin.name}
            </p>
          </div>
        </div>

        {/* Right: Price info */}
        <div className="text-right">
          <p className="text-label font-mono font-semibold text-tg-text">
            {formatPrice(currentPrice)}
          </p>
          <p className={cn('text-body-sm font-mono font-medium', getPriceChangeColor(priceChange))}>
            {formatPercentage(priceChange)}
          </p>
        </div>
      </div>

      {/* Bottom: Sparkline and volume */}
      <div className="flex items-center justify-between">
        <Sparkline
          data={sparklineData}
          width={100}
          height={28}
          className="opacity-80"
        />
        <p className="text-body-sm text-tg-hint">
          Vol: {formatLargeNumber(volume)}
        </p>
      </div>
    </motion.button>
  )
}

// Memoize to prevent unnecessary re-renders when price updates
export const WatchlistCard = memo(WatchlistCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.item.coin.id === nextProps.item.coin.id &&
    prevProps.item.alertsCount === nextProps.item.alertsCount &&
    prevProps.price?.price === nextProps.price?.price &&
    prevProps.price?.change24hPct === nextProps.price?.change24hPct
  )
})
