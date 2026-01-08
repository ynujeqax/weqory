import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarketCapCardProps {
  marketCap: number
  marketCapChange24hPct: number
}

export function MarketCapCard({ marketCap, marketCapChange24hPct }: MarketCapCardProps) {
  const isPositive = marketCapChange24hPct >= 0

  const formattedMarketCap = useMemo(() => {
    if (marketCap >= 1e12) {
      return `$${(marketCap / 1e12).toFixed(2)}T`
    }
    if (marketCap >= 1e9) {
      return `$${(marketCap / 1e9).toFixed(2)}B`
    }
    return `$${(marketCap / 1e6).toFixed(2)}M`
  }, [marketCap])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-surface rounded-xl px-4 py-4 border border-border-subtle"
    >
      {/* Label */}
      <p className="text-tg-hint text-[11px] uppercase tracking-wide mb-2">
        Crypto Market Cap
      </p>

      {/* Value */}
      <motion.p
        className="font-mono font-bold text-[32px] leading-none text-tg-text mb-2"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {formattedMarketCap}
      </motion.p>

      {/* Change */}
      <motion.div
        className="flex items-center gap-1"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {isPositive ? (
          <TrendingUp size={14} className="text-crypto-up" />
        ) : (
          <TrendingDown size={14} className="text-crypto-down" />
        )}
        <span
          className={cn(
            'text-body-sm font-semibold',
            isPositive ? 'text-crypto-up' : 'text-crypto-down'
          )}
        >
          {isPositive ? '+' : ''}{marketCapChange24hPct.toFixed(2)}%
        </span>
        <span className="text-body-sm text-tg-hint">24h</span>
      </motion.div>
    </motion.div>
  )
}
