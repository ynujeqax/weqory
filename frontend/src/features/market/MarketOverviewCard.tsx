import { cn, formatLargeNumber, formatPercentage, getPriceChangeColor } from '@/lib/utils'
import type { MarketOverview } from '@/types'

interface MarketOverviewCardProps {
  data: MarketOverview
}

export function MarketOverviewCard({ data }: MarketOverviewCardProps) {
  const {
    totalMarketCap,
    totalVolume24h,
    btcDominance,
    marketCapChange24hPct,
  } = data

  return (
    <div className="bg-surface rounded-lg px-4 py-3">
      {/* Single row with all stats */}
      <div className="flex items-center justify-between gap-4 text-body-sm">
        {/* Market Cap */}
        <div className="flex-1 min-w-0">
          <p className="text-tg-hint mb-0.5 text-[11px] uppercase tracking-wide">Cap</p>
          <p className="text-tg-text font-mono font-medium truncate">
            {formatLargeNumber(totalMarketCap)}
          </p>
        </div>

        {/* 24h Change */}
        <div className="flex-shrink-0">
          <p className="text-tg-hint mb-0.5 text-[11px] uppercase tracking-wide">24h</p>
          <p className={cn(
            'font-mono font-semibold',
            getPriceChangeColor(marketCapChange24hPct)
          )}>
            {formatPercentage(marketCapChange24hPct)}
          </p>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-border-subtle" />

        {/* Volume */}
        <div className="flex-1 min-w-0">
          <p className="text-tg-hint mb-0.5 text-[11px] uppercase tracking-wide">Vol</p>
          <p className="text-tg-text font-mono font-medium truncate">
            {formatLargeNumber(totalVolume24h)}
          </p>
        </div>

        {/* BTC Dominance */}
        <div className="flex-shrink-0">
          <p className="text-tg-hint mb-0.5 text-[11px] uppercase tracking-wide">BTC</p>
          <p className="text-tg-text font-mono font-medium">
            {btcDominance.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  )
}
