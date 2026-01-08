import { useMemo, useCallback, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/common/PageHeader'
import { Tabs, type Tab } from '@/components/ui/Tabs'
import {
  TopCoinsCarousel,
  FearGreedGauge,
  MarketStatsCard,
  DominanceBar,
  MarketCoinCard,
  MarketFilters,
  MarketSkeletonList,
  TopCoinsCarouselSkeleton,
  FearGreedSkeleton,
  MarketStatsSkeleton,
  DominanceBarSkeleton,
} from '@/features/market'
import { useMarketOverview, useAvailableCoins, useWatchlist, useAddToWatchlist, useUser } from '@/api/hooks'
import { useMarketStore } from '@/stores/marketStore'
import { usePricesStore } from '@/stores/pricesStore'
import type { Coin } from '@/types'

const tabs: Tab[] = [
  { id: 'all', label: 'All' },
  { id: 'top100', label: 'Top 100' },
  { id: 'defi', label: 'DeFi' },
  { id: 'layer1', label: 'Layer 1' },
]

export default function MarketPage() {
  // State
  const { activeTab, sortField, sortDirection, setActiveTab, setSorting } = useMarketStore()
  const parentRef = useRef<HTMLDivElement>(null)

  // Data fetching
  const { data: marketOverview, isLoading: isLoadingOverview, refetch: refetchOverview } = useMarketOverview()
  const { data: allCoins, isLoading: isLoadingCoins, refetch: refetchCoins } = useAvailableCoins(undefined, 1000)
  const { data: watchlist } = useWatchlist()
  const { data: user } = useUser()
  const addToWatchlist = useAddToWatchlist()

  // Real-time prices
  const prices = usePricesStore(state => state.prices)

  // Check if coin is in watchlist
  const isInWatchlist = useCallback(
    (symbol: string) => {
      return watchlist?.items.some((item) => item.coin.symbol === symbol) ?? false
    },
    [watchlist]
  )

  // Check if can add more coins
  const limits = user?.limits
  const canAddMore = limits ? limits.coinsUsed < limits.maxCoins : true

  // Filter coins by active tab
  const filteredCoins = useMemo(() => {
    if (!allCoins) return []

    let filtered = allCoins.coins

    switch (activeTab) {
      case 'top100':
        filtered = filtered.filter(coin => coin.rank && coin.rank <= 100)
        break
      case 'defi':
        // In production, filter by DeFi category from backend
        filtered = filtered.filter(coin =>
          ['UNI', 'AAVE', 'CAKE', 'SUSHI', 'CRV', 'COMP', 'MKR', 'SNX'].includes(coin.symbol)
        )
        break
      case 'layer1':
        // In production, filter by Layer 1 category from backend
        filtered = filtered.filter(coin =>
          ['BTC', 'ETH', 'SOL', 'ADA', 'AVAX', 'DOT', 'NEAR', 'ATOM', 'FTM', 'ALGO'].includes(coin.symbol)
        )
        break
    }

    return filtered
  }, [allCoins, activeTab])

  // Sort coins
  const sortedCoins = useMemo(() => {
    const coins = [...filteredCoins]

    coins.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'rank':
          comparison = (a.rank ?? Infinity) - (b.rank ?? Infinity)
          break
        case 'price':
          comparison = (a.currentPrice ?? 0) - (b.currentPrice ?? 0)
          break
        case 'change24h':
          comparison = (a.priceChange24hPct ?? 0) - (b.priceChange24hPct ?? 0)
          break
        case 'volume':
          comparison = (a.volume24h ?? 0) - (b.volume24h ?? 0)
          break
        case 'marketCap':
          comparison = (a.marketCap ?? 0) - (b.marketCap ?? 0)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return coins
  }, [filteredCoins, sortField, sortDirection])

  // Generate sparkline data (mock - in production would come from API)
  const getSparklineData = useCallback((symbol: string) => {
    const price = prices.get(symbol)?.price ?? 0
    if (!price) return []

    // Generate mock sparkline
    return Array.from({ length: 24 }, () => {
      const variance = (Math.random() - 0.5) * 0.1
      return price * (1 + variance)
    })
  }, [prices])

  // Virtualizer for efficient rendering
  const virtualizer = useVirtualizer({
    count: sortedCoins.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56, // Estimated height of compact MarketCoinCard row
    overscan: 5, // Render 5 items above and below viewport
  })

  const handleRefresh = async () => {
    await Promise.all([refetchOverview(), refetchCoins()])
  }

  const handleToggleWatchlist = async (coin: Coin) => {
    const inWatchlist = isInWatchlist(coin.symbol)

    if (!inWatchlist && !canAddMore) {
      return
    }

    try {
      await addToWatchlist.mutateAsync(coin.symbol)
    } catch (error) {
      // Error is handled by React Query
    }
  }

  const isLoading = isLoadingOverview || isLoadingCoins

  return (
    <div className="min-h-screen pb-20 bg-bg-primary">
      <PageHeader title="Market" />

      <div className="space-y-4">
        {/* Top Coins Carousel */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="pt-3"
        >
          {isLoadingOverview ? (
            <TopCoinsCarouselSkeleton />
          ) : marketOverview?.top_coins && marketOverview.top_coins.length > 0 ? (
            <TopCoinsCarousel coins={marketOverview.top_coins} />
          ) : null}
        </motion.div>

        <div className="px-4 space-y-3">
          {/* Market Stats Grid - Fear & Greed + Market Stats side by side on wider screens */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {isLoadingOverview ? (
              <>
                <FearGreedSkeleton />
                <MarketStatsSkeleton />
              </>
            ) : marketOverview ? (
              <>
                <FearGreedGauge
                  value={marketOverview.fear_greed_index.value}
                  classification={marketOverview.fear_greed_index.classification}
                />
                <MarketStatsCard
                  marketCap={marketOverview.total_market_cap}
                  volume24h={marketOverview.total_volume_24h}
                  marketCapChange24hPct={marketOverview.market_cap_change_24h_pct}
                />
              </>
            ) : null}
          </motion.div>

          {/* Bitcoin Dominance Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            {isLoadingOverview ? (
              <DominanceBarSkeleton />
            ) : marketOverview ? (
              <DominanceBar
                btcDominance={marketOverview.btc_dominance}
                ethDominance={marketOverview.eth_dominance}
              />
            ) : null}
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={(tabId) => setActiveTab(tabId as typeof activeTab)}
            />
          </motion.div>

          {/* Filters */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 overflow-hidden">
              <MarketFilters
                sortField={sortField}
                sortDirection={sortDirection}
                onSortChange={setSorting}
              />
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex-shrink-0 w-8 h-8 rounded-md bg-surface-elevated flex items-center justify-center text-tg-hint touch-feedback transition-colors duration-150"
            >
              <RefreshCw
                size={16}
                className={isLoading ? 'animate-spin' : ''}
              />
            </button>
          </div>

          {/* Coins List */}
          {isLoadingCoins ? (
            <MarketSkeletonList count={10} />
          ) : sortedCoins.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-body text-tg-hint">No coins found</p>
            </div>
          ) : (
            <div className="bg-surface rounded-lg overflow-hidden border border-border-subtle">
              <div
                ref={parentRef}
                className="overflow-auto"
                style={{
                  height: 'calc(100vh - 540px)', // Adjusted for new layout height
                  minHeight: '300px',
                }}
              >
                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {virtualizer.getVirtualItems().map((virtualItem) => {
                    const coin = sortedCoins[virtualItem.index]
                    if (!coin) return null

                    return (
                      <div
                        key={coin.id}
                        data-index={virtualItem.index}
                        ref={virtualizer.measureElement}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualItem.start}px)`,
                        }}
                      >
                        <MarketCoinCard
                          coin={coin}
                          isInWatchlist={isInWatchlist(coin.symbol)}
                          onToggleWatchlist={() => handleToggleWatchlist(coin)}
                          sparklineData={getSparklineData(coin.binanceSymbol)}
                          disabled={!canAddMore && !isInWatchlist(coin.symbol)}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* End of list indicator */}
              {sortedCoins.length > 20 && (
                <div className="py-3 text-center border-t border-border-subtle">
                  <p className="text-body-sm text-tg-hint">
                    {sortedCoins.length} coins
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
