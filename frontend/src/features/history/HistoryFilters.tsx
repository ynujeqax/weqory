import { Select, type SelectOption } from '@/components/ui/Select'
import type { WatchlistItem } from '@/types'

interface HistoryFiltersProps {
  selectedCoin: string
  onCoinChange: (symbol: string) => void
  watchlist: WatchlistItem[]
}

export function HistoryFilters({
  selectedCoin,
  onCoinChange,
  watchlist,
}: HistoryFiltersProps) {
  const coinOptions: SelectOption[] = [
    { value: 'all', label: 'All Coins' },
    ...watchlist.map((item) => ({
      value: item.coin.symbol,
      label: `${item.coin.symbol} - ${item.coin.name}`,
    })),
  ]

  return (
    <div className="bg-surface rounded-lg p-4">
      <div className="flex items-center gap-3">
        <span className="text-label text-tg-hint whitespace-nowrap">
          Filter by:
        </span>
        <Select
          value={selectedCoin}
          onChange={onCoinChange}
          options={coinOptions}
          className="flex-1"
        />
      </div>
    </div>
  )
}
