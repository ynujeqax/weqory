import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTelegram } from '@/hooks/useTelegram'

export type SortField = 'rank' | 'price' | 'change24h' | 'volume' | 'marketCap'
export type SortDirection = 'asc' | 'desc'

interface MarketFiltersProps {
  sortField: SortField
  sortDirection: SortDirection
  onSortChange: (field: SortField, direction: SortDirection) => void
}

const sortOptions: { field: SortField; label: string }[] = [
  { field: 'rank', label: 'Rank' },
  { field: 'price', label: 'Price' },
  { field: 'change24h', label: '24h %' },
  { field: 'volume', label: 'Volume' },
  { field: 'marketCap', label: 'Market Cap' },
]

export function MarketFilters({ sortField, sortDirection, onSortChange }: MarketFiltersProps) {
  const { hapticFeedback } = useTelegram()

  const handleSort = (field: SortField) => {
    hapticFeedback('light')

    if (field === sortField) {
      // Toggle direction
      onSortChange(field, sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New field, default to desc for most, asc for rank
      onSortChange(field, field === 'rank' ? 'asc' : 'desc')
    }
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
      {sortOptions.map((option) => {
        const isActive = sortField === option.field
        const SortIcon = !isActive
          ? ArrowUpDown
          : sortDirection === 'asc'
          ? ArrowUp
          : ArrowDown

        return (
          <button
            key={option.field}
            onClick={() => handleSort(option.field)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-md',
              'text-[13px] font-medium whitespace-nowrap flex-shrink-0',
              'transition-colors duration-150 touch-feedback',
              isActive
                ? 'bg-tg-button text-tg-button-text'
                : 'bg-surface-elevated text-tg-hint'
            )}
          >
            <span>{option.label}</span>
            <SortIcon size={12} />
          </button>
        )
      })}
    </div>
  )
}
