import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/Button'
import {
  WatchlistCard,
  WatchlistSkeletonList,
  WatchlistEmpty,
  CoinDetailSheet,
} from '@/features/watchlist'
import { useWatchlist, useRemoveFromWatchlist } from '@/api/hooks'
import { usePricesStore } from '@/stores/pricesStore'
import { useTelegram } from '@/hooks/useTelegram'
import type { WatchlistItem } from '@/types'

export default function WatchlistPage() {
  const navigate = useNavigate()
  const { hapticFeedback } = useTelegram()

  // Data fetching
  const { data: watchlist, isLoading, refetch, isFetching } = useWatchlist()
  const removeFromWatchlist = useRemoveFromWatchlist()

  // Real-time prices
  const prices = usePricesStore(state => state.prices)

  // Selected coin for detail sheet
  const [selectedItem, setSelectedItem] = useState<WatchlistItem | null>(null)

  // Pull to refresh state
  const [, setIsPulling] = useState(false)

  const isEmpty = !isLoading && (!watchlist || watchlist.items.length === 0)

  // Generate sparkline data (mock - in production would come from API)
  const getSparklineData = useCallback((symbol: string) => {
    const price = prices.get(symbol)?.price ?? 0
    if (!price) return []

    // Generate mock sparkline (24 hours of data)
    return Array.from({ length: 24 }, () => {
      const variance = (Math.random() - 0.5) * 0.1
      return price * (1 + variance)
    })
  }, [prices])

  const handleRefresh = async () => {
    hapticFeedback('light')
    setIsPulling(true)
    await refetch()
    setIsPulling(false)
  }

  const handleCardClick = (item: WatchlistItem) => {
    hapticFeedback('light')
    setSelectedItem(item)
  }

  const handleCloseSheet = () => {
    setSelectedItem(null)
  }

  const handleCreateAlert = () => {
    if (!selectedItem) return
    hapticFeedback('medium')
    navigate('/alerts/create', {
      state: { coinSymbol: selectedItem.coin.symbol }
    })
  }

  const handleRemove = async () => {
    if (!selectedItem) return

    try {
      hapticFeedback('medium')
      await removeFromWatchlist.mutateAsync(selectedItem.coin.symbol)
      setSelectedItem(null)
    } catch (error) {
      console.error('Failed to remove from watchlist:', error)
      hapticFeedback('error')
    }
  }

  const handleAddCoin = () => {
    hapticFeedback('light')
    navigate('/add-coin')
  }

  const hasItems = !isLoading && watchlist && watchlist.items.length > 0

  return (
    <div className={hasItems ? 'pb-20' : ''}>
      <PageHeader
        title="Watchlist"
        action={
          hasItems
            ? {
                label: 'Add',
                onClick: handleAddCoin,
              }
            : undefined
        }
      />

      <div className="px-4 py-3">
        {/* Refresh Button */}
        {hasItems && (
          <div className="mb-4 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
              leftIcon={
                <RefreshCw
                  size={16}
                  className={isFetching ? 'animate-spin' : ''}
                />
              }
            >
              {isFetching ? 'Updating...' : 'Refresh'}
            </Button>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <WatchlistSkeletonList count={3} />
        ) : isEmpty ? (
          <WatchlistEmpty onAddCoin={handleAddCoin} />
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {watchlist?.items.map((item) => (
                <WatchlistCard
                  key={item.id}
                  item={item}
                  price={prices.get(item.coin.binanceSymbol)}
                  sparklineData={getSparklineData(item.coin.binanceSymbol)}
                  onClick={() => handleCardClick(item)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* FAB */}
      {hasItems && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="fixed bottom-24 right-4 z-10"
        >
          <Button
            onClick={handleAddCoin}
            size="lg"
            className="rounded-full w-14 h-14 shadow-xl shadow-black/20"
          >
            <Plus size={24} />
          </Button>
        </motion.div>
      )}

      {/* Coin Detail Sheet */}
      {selectedItem && (
        <CoinDetailSheet
          isOpen={!!selectedItem}
          onClose={handleCloseSheet}
          item={selectedItem}
          price={prices.get(selectedItem.coin.binanceSymbol)}
          sparklineData={getSparklineData(selectedItem.coin.binanceSymbol)}
          onCreateAlert={handleCreateAlert}
          onRemove={handleRemove}
        />
      )}
    </div>
  )
}
