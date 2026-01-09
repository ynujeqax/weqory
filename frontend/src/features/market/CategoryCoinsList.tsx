import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { categories, type CategoryId } from './CategoriesSection'
import type { Coin } from '@/types'

interface CategoryCoinsListProps {
  categoryId: CategoryId
  coins: Coin[]
}

// Format price with appropriate precision
function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }
  if (price >= 1) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  if (price >= 0.01) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`
  }
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 })}`
}

// Format market cap
function formatMarketCap(marketCap: number | undefined): string {
  if (!marketCap) return '-'
  if (marketCap >= 1e12) {
    return `$${(marketCap / 1e12).toFixed(2)}T`
  }
  if (marketCap >= 1e9) {
    return `$${(marketCap / 1e9).toFixed(2)}B`
  }
  if (marketCap >= 1e6) {
    return `$${(marketCap / 1e6).toFixed(2)}M`
  }
  return `$${marketCap.toLocaleString()}`
}

export function CategoryCoinsList({ categoryId, coins }: CategoryCoinsListProps) {
  // Get the selected category
  const category = useMemo(() => {
    return categories.find(c => c.id === categoryId)
  }, [categoryId])

  // Filter coins by category symbols and sort by market cap
  const filteredCoins = useMemo(() => {
    if (!category) return []

    const categorySymbols = new Set(category.symbols.map(s => s.toUpperCase()))

    return coins
      .filter(coin => categorySymbols.has(coin.symbol.toUpperCase()))
      .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
      .slice(0, 20)
  }, [coins, category])

  if (!category) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="space-y-3"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-headline-sm font-semibold text-tg-text">
          Top {category.name} Coins
        </h2>
        <span className="text-body-sm text-tg-hint">
          {filteredCoins.length} coins
        </span>
      </div>

      {/* Coins List */}
      <div
        className="bg-surface rounded-xl border border-white/10 overflow-hidden"
        style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        {filteredCoins.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-body text-tg-hint">
              No coins found in this category
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredCoins.map((coin, index) => (
              <motion.div
                key={coin.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.35 + index * 0.02 }}
                className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/5 transition-colors"
              >
                {/* Left: Rank + Symbol + Name */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Rank */}
                  <span className="text-body-xs font-medium text-tg-hint w-5 flex-shrink-0 text-center">
                    {index + 1}
                  </span>

                  {/* Coin Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-body font-semibold text-tg-text">
                        {coin.symbol}
                      </span>
                      <span className="text-body-sm text-tg-hint truncate">
                        {coin.name}
                      </span>
                    </div>
                    <span className="text-body-xs text-tg-hint">
                      MCap: {formatMarketCap(coin.marketCap)}
                    </span>
                  </div>
                </div>

                {/* Right: Price + Change */}
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-body font-semibold text-tg-text">
                    {coin.currentPrice ? formatPrice(coin.currentPrice) : '-'}
                  </span>

                  {coin.priceChange24hPct !== undefined && (
                    <div
                      className={cn(
                        'flex items-center gap-0.5 text-body-sm font-medium',
                        coin.priceChange24hPct >= 0 ? 'text-crypto-up' : 'text-crypto-down'
                      )}
                    >
                      {coin.priceChange24hPct >= 0 ? (
                        <TrendingUp size={12} />
                      ) : (
                        <TrendingDown size={12} />
                      )}
                      <span>
                        {coin.priceChange24hPct >= 0 ? '+' : ''}
                        {coin.priceChange24hPct.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
