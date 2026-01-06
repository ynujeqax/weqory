import { useState, useCallback, useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import { useHistory, useDeleteHistory, useWatchlist } from '@/api/hooks'
import { useTelegram } from '@/hooks/useTelegram'
import { useToast } from '@/hooks/useToast'
import { PageHeader } from '@/components/common/PageHeader'
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

  const hasHistory = !isLoading && filteredItems.length > 0

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
    <div className={hasHistory ? 'pb-20' : ''}>
      <PageHeader
        title="History"
        action={
          hasHistory
            ? {
                icon: <Trash2 size={20} />,
                onClick: handleOpenClearDialog,
              }
            : undefined
        }
      />

      <div className="px-4 py-3">
        {/* Filters */}
        {hasHistory && watchlistData && watchlistData.items.length > 0 && (
          <div className="mb-4">
            <HistoryFilters
              selectedCoin={selectedCoin}
              onCoinChange={handleCoinChange}
              watchlist={watchlistData.items}
            />
          </div>
        )}

        {/* Content */}
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
