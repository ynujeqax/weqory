import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useWatchlist } from '@/api/hooks'
import { SearchBar } from '@/components/ui/SearchBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { hapticFeedback } from '@telegram-apps/sdk'
import { usePricesStore } from '@/stores/pricesStore'
import type { Coin } from '@/types'

interface CoinSelectorProps {
  selectedCoin: Coin | null
  onSelect: (coin: Coin) => void
}

export function CoinSelector({ selectedCoin, onSelect }: CoinSelectorProps) {
  const [search, setSearch] = useState('')
  const { data: watchlist, isLoading } = useWatchlist()
  const prices = usePricesStore((state) => state.prices)

  const filteredCoins = useMemo(() => {
    if (!watchlist?.items) return []

    const query = search.toLowerCase()
    return watchlist.items
      .filter(
        (item) =>
          item.coin.symbol.toLowerCase().includes(query) ||
          item.coin.name.toLowerCase().includes(query)
      )
      .map((item) => item.coin)
  }, [watchlist, search])

  const handleSelect = (coin: Coin) => {
    hapticFeedback.impactOccurred('light')
    onSelect(coin)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    )
  }

  if (!watchlist?.items.length) {
    return (
      <EmptyState
        title="No coins in watchlist"
        description="Add coins to your watchlist first to create alerts for them"
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search coins..."
        className="sticky top-0 z-10"
      />

      {/* Coin list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredCoins.map((coin) => {
            const price = prices.get(coin.symbol)
            const isSelected = selectedCoin?.id === coin.id

            return (
              <motion.button
                key={coin.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect(coin)}
                className={`w-full p-4 rounded-xl transition-colors ${
                  isSelected
                    ? 'bg-tg-button/20 border-2 border-tg-button'
                    : 'bg-surface hover:bg-surface-elevated border-2 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center font-semibold text-tg-text">
                      {coin.symbol.slice(0, 2)}
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-tg-text">{coin.symbol}</h3>
                      <p className="text-sm text-tg-hint">{coin.name}</p>
                    </div>
                  </div>

                  {price && (
                    <div className="text-right">
                      <p className="font-semibold text-tg-text font-mono">
                        ${price.price.toLocaleString()}
                      </p>
                      <div
                        className={`flex items-center gap-1 text-xs ${
                          price.change24hPct >= 0 ? 'text-success' : 'text-danger'
                        }`}
                      >
                        {price.change24hPct >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>{Math.abs(price.change24hPct).toFixed(2)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.button>
            )
          })}
        </AnimatePresence>

        {filteredCoins.length === 0 && search && (
          <EmptyState
            title="No results found"
            description={`No coins matching "${search}"`}
          />
        )}
      </div>
    </div>
  )
}
