import { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { useHistory, useDeleteHistory, useWatchlist } from '@/api/hooks'
import { useTelegram } from '@/hooks/useTelegram'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/ui/Button'
import { HistoryTimeline } from '@/features/history/HistoryTimeline'
import { HistorySkeleton } from '@/features/history/HistorySkeleton'
import { HistoryEmpty } from '@/features/history/HistoryEmpty'
import { HistoryFilters } from '@/features/history/HistoryFilters'
import { ClearHistoryDialog } from '@/features/history/ClearHistoryDialog'

const ITEMS_PER_PAGE = 20

export default function History() {
  const { hapticFeedback } = useTelegram()
  const { showToast } = useToast()
  const [selectedCoin, setSelectedCoin] = useState('all')
  const [showClearDialog, setShowClearDialog] = useState(false)

  const { data: historyData, isLoading } = useHistory(ITEMS_PER_PAGE, 0)
  const { data: watchlistData } = useWatchlist()
  const deleteHistory = useDeleteHistory()

  const filteredItems = useMemo(() => {
    if (!historyData?.items) return []
    if (selectedCoin === 'all') return historyData.items

    return historyData.items.filter(
      (item) => item.coin.symbol === selectedCoin
    )
  }, [historyData?.items, selectedCoin])

  const handleCoinChange = useCallback(
    (symbol: string) => {
      hapticFeedback('selection')
      setSelectedCoin(symbol)
    },
    [hapticFeedback]
  )

  const handleClearHistory = useCallback(async () => {
    hapticFeedback('medium')

    try {
      await deleteHistory.mutateAsync()
      showToast({
        type: 'success',
        message: 'History cleared successfully',
      })
      setShowClearDialog(false)
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to clear history',
      })
    }
  }, [deleteHistory, hapticFeedback, showToast])

  const handleOpenClearDialog = useCallback(() => {
    hapticFeedback('light')
    setShowClearDialog(true)
  }, [hapticFeedback])

  return (
    <div className="min-h-screen bg-tg-bg pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 bg-tg-bg/80 backdrop-blur-sm border-b border-white/5 px-4 py-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-display font-bold text-tg-text">History</h1>
            {historyData && (
              <p className="text-body-sm text-tg-hint mt-1">
                {filteredItems.length} {filteredItems.length === 1 ? 'alert' : 'alerts'} triggered
                {historyData.retention_days && (
                  <> • Last {historyData.retention_days} days</>
                )}
              </p>
            )}
          </div>

          {filteredItems.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenClearDialog}
              className="text-danger hover:bg-danger-soft"
            >
              <Trash2 size={16} />
              Clear
            </Button>
          )}
        </div>

        {/* Filters */}
        {watchlistData && watchlistData.items.length > 0 && (
          <HistoryFilters
            selectedCoin={selectedCoin}
            onCoinChange={handleCoinChange}
            watchlist={watchlistData.items}
          />
        )}
      </motion.div>

      {/* Content */}
      <div className="px-4 pt-4">
        {isLoading ? (
          <HistorySkeleton />
        ) : filteredItems.length === 0 ? (
          <HistoryEmpty />
        ) : (
          <HistoryTimeline items={filteredItems} />
        )}
      </div>

      {/* Clear History Dialog */}
      <ClearHistoryDialog
        isOpen={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        onConfirm={handleClearHistory}
        isLoading={deleteHistory.isPending}
      />
    </div>
  )
}
