import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Bitcoin } from 'lucide-react'
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
    <div className="bg-surface rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-headline font-semibold text-tg-text">
          Market Overview
        </h3>
        <motion.div
          key={marketCapChange24hPct > 0 ? 'up' : 'down'}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {marketCapChange24hPct > 0 ? (
            <TrendingUp size={20} className="text-crypto-up" />
          ) : (
            <TrendingDown size={20} className="text-crypto-down" />
          )}
        </motion.div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatItem
          icon={<DollarSign size={16} />}
          label="Market Cap"
          value={formatLargeNumber(totalMarketCap)}
          change={marketCapChange24hPct}
        />
        <StatItem
          icon={<BarChart3 size={16} />}
          label="24h Volume"
          value={formatLargeNumber(totalVolume24h)}
        />
        <StatItem
          icon={<Bitcoin size={16} />}
          label="BTC Dominance"
          value={`${btcDominance.toFixed(1)}%`}
        />
        <StatItem
          icon={<TrendingUp size={16} />}
          label="24h Change"
          value={formatPercentage(marketCapChange24hPct)}
          change={marketCapChange24hPct}
        />
      </div>
    </div>
  )
}

interface StatItemProps {
  icon: React.ReactNode
  label: string
  value: string
  change?: number
}

function StatItem({ icon, label, value, change }: StatItemProps) {
  return (
    <div className="bg-surface-elevated rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2 text-tg-hint">
        {icon}
        <p className="text-body-sm">{label}</p>
      </div>
      <p className={cn(
        'text-label font-semibold font-mono',
        change !== undefined ? getPriceChangeColor(change) : 'text-tg-text'
      )}>
        {value}
      </p>
    </div>
  )
}
