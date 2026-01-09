import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Trophy, Award, Medal } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Coin } from '@/types'

interface GainersLosersTableProps {
  coins: Coin[]
}

// Rank badge component
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow-lg">
        <Trophy size={12} className="text-white" />
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center shadow-lg">
        <Award size={12} className="text-white" />
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center shadow-lg">
        <Medal size={12} className="text-white" />
      </div>
    )
  }
  return (
    <span className="text-body-xs font-medium text-tg-hint flex-shrink-0 w-6 text-center">
      {rank}
    </span>
  )
}

export function GainersLosersTable({ coins }: GainersLosersTableProps) {
  // Get top 20 gainers (highest % change)
  const topGainers = useMemo(() => {
    return coins
      .filter(coin => (coin.priceChange24hPct ?? 0) > 0)
      .sort((a, b) => (b.priceChange24hPct ?? 0) - (a.priceChange24hPct ?? 0))
      .slice(0, 20)
  }, [coins])

  // Get top 20 losers (biggest % loss)
  const topLosers = useMemo(() => {
    return coins
      .filter(coin => (coin.priceChange24hPct ?? 0) < 0)
      .sort((a, b) => (a.priceChange24hPct ?? 0) - (b.priceChange24hPct ?? 0))
      .slice(0, 20)
  }, [coins])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="bg-surface rounded-xl border border-white/10 overflow-hidden"
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div className="grid grid-cols-2 divide-x divide-white/10">
        {/* Top Gainers Column */}
        <div className="flex flex-col">
          {/* Header with gradient */}
          <div className="px-3 py-3 bg-gradient-to-r from-crypto-up/5 to-transparent border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-crypto-up/10 flex items-center justify-center">
                <TrendingUp size={14} className="text-crypto-up" />
              </div>
              <h3 className="text-body-sm font-semibold text-tg-text">Top Gainers</h3>
            </div>
          </div>

          {/* Gainers List */}
          <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
            {topGainers.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <p className="text-body-sm text-tg-hint">No gainers</p>
              </div>
            ) : (
              topGainers.map((coin, index) => (
                <motion.div
                  key={coin.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 + index * 0.02 }}
                  className={cn(
                    'px-3 py-2.5 flex items-center justify-between gap-2 transition-colors',
                    'hover:bg-crypto-up/5',
                    index < topGainers.length - 1 && 'border-b border-white/5'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <RankBadge rank={index + 1} />
                    <span className="text-body-sm font-medium text-tg-text truncate">
                      {coin.symbol}
                    </span>
                  </div>
                  <span className="text-body-sm font-semibold text-crypto-up flex-shrink-0">
                    +{(coin.priceChange24hPct ?? 0).toFixed(2)}%
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Top Losers Column */}
        <div className="flex flex-col">
          {/* Header with gradient */}
          <div className="px-3 py-3 bg-gradient-to-r from-crypto-down/5 to-transparent border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-crypto-down/10 flex items-center justify-center">
                <TrendingDown size={14} className="text-crypto-down" />
              </div>
              <h3 className="text-body-sm font-semibold text-tg-text">Top Losers</h3>
            </div>
          </div>

          {/* Losers List */}
          <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
            {topLosers.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <p className="text-body-sm text-tg-hint">No losers</p>
              </div>
            ) : (
              topLosers.map((coin, index) => (
                <motion.div
                  key={coin.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 + index * 0.02 }}
                  className={cn(
                    'px-3 py-2.5 flex items-center justify-between gap-2 transition-colors',
                    'hover:bg-crypto-down/5',
                    index < topLosers.length - 1 && 'border-b border-white/5'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <RankBadge rank={index + 1} />
                    <span className="text-body-sm font-medium text-tg-text truncate">
                      {coin.symbol}
                    </span>
                  </div>
                  <span className="text-body-sm font-semibold text-crypto-down flex-shrink-0">
                    {(coin.priceChange24hPct ?? 0).toFixed(2)}%
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
