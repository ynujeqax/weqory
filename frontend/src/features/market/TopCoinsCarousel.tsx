import { useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { TopCoinCard } from './TopCoinCard'
import { usePricesStore } from '@/stores/pricesStore'
import type { Coin } from '@/types'

interface TopCoinsCarouselProps {
  coins: Coin[]
}

export function TopCoinsCarousel({ coins }: TopCoinsCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const prices = usePricesStore(state => state.prices)

  // Generate sparkline data (mock - in production would come from API)
  const getSparklineData = useCallback((symbol: string) => {
    const price = prices.get(symbol)?.price ?? 0
    if (!price) return []

    // Generate mock sparkline with realistic variance
    return Array.from({ length: 24 }, (_, i) => {
      const variance = Math.sin(i * 0.5) * 0.05 + (Math.random() - 0.5) * 0.03
      return price * (1 + variance)
    })
  }, [prices])

  // Take top 5 coins
  const topCoins = coins.slice(0, 5)

  if (topCoins.length === 0) {
    return null
  }

  return (
    <div className="relative -mx-4 px-4">
      {/* Gradient fade on edges */}
      <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-bg-primary to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-bg-primary to-transparent z-10 pointer-events-none" />

      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth px-4"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {topCoins.map((coin, index) => (
          <motion.div
            key={coin.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="snap-start"
          >
            <TopCoinCard
              coin={coin}
              sparklineData={getSparklineData(coin.binanceSymbol)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
