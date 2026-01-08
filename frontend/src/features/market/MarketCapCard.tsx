import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'
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
      className="relative overflow-hidden bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f1729] rounded-xl px-4 py-4 border border-white/10"
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Decorative background pattern */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
        <BarChart3 size={128} className="text-tg-text" />
      </div>

      {/* Subtle glow effect */}
      <div
        className={cn(
          'absolute -top-12 -right-12 w-24 h-24 rounded-full blur-3xl opacity-10',
          isPositive ? 'bg-crypto-up' : 'bg-crypto-down'
        )}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Label */}
        <p className="text-tg-hint text-[11px] uppercase tracking-wide mb-2 font-medium">
          Crypto Market Cap
        </p>

        {/* Value with enhanced styling */}
        <motion.p
          className="font-mono font-bold text-[36px] leading-none text-white mb-2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            textShadow: '0 2px 20px rgba(255, 255, 255, 0.2)',
          }}
        >
          {formattedMarketCap}
        </motion.p>

        {/* Change with enhanced badge */}
        <motion.div
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
            isPositive
              ? 'bg-crypto-up/10 border border-crypto-up/20'
              : 'bg-crypto-down/10 border border-crypto-down/20'
          )}
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
          <span className="text-body-xs text-tg-hint font-medium">24h</span>
        </motion.div>
      </div>
    </motion.div>
  )
}
