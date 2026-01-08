import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn, formatLargeNumber, formatPercentage, getPriceChangeColor } from '@/lib/utils'

interface MarketStatsCardProps {
  marketCap: number
  volume24h: number
  marketCapChange24hPct: number
}

export function MarketStatsCard({
  marketCap,
  volume24h,
  marketCapChange24hPct,
}: MarketStatsCardProps) {
  const isPositive = marketCapChange24hPct >= 0

  return (
    <div className="bg-surface rounded-xl px-4 py-4 border border-border-subtle">
      <div className="space-y-4">
        {/* Market Cap */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-tg-hint text-[11px] uppercase tracking-wide">
              Market Cap
            </p>
            <div className={cn(
              'flex items-center gap-1 text-body-sm font-mono font-semibold',
              getPriceChangeColor(marketCapChange24hPct)
            )}>
              {isPositive ? (
                <TrendingUp size={14} />
              ) : (
                <TrendingDown size={14} />
              )}
              <span>{formatPercentage(marketCapChange24hPct)}</span>
            </div>
          </div>
          <motion.p
            className="text-headline-lg font-bold text-tg-text font-mono"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {formatLargeNumber(marketCap)}
          </motion.p>
        </div>

        {/* Divider */}
        <div className="h-px bg-border-subtle" />

        {/* 24h Volume */}
        <div>
          <p className="text-tg-hint text-[11px] uppercase tracking-wide mb-1">
            24h Volume
          </p>
          <motion.p
            className="text-label-lg font-semibold text-tg-text font-mono"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {formatLargeNumber(volume24h)}
          </motion.p>
        </div>
      </div>
    </div>
  )
}
