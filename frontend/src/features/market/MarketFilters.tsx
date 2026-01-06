import { motion } from 'framer-motion'
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
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
      {sortOptions.map((option) => {
        const isActive = sortField === option.field
        const SortIcon = !isActive
          ? ArrowUpDown
          : sortDirection === 'asc'
          ? ArrowUp
          : ArrowDown

        return (
          <motion.button
            key={option.field}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSort(option.field)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg',
              'text-body-sm font-medium whitespace-nowrap',
              'transition-colors duration-200 touch-feedback',
              isActive
                ? 'bg-tg-button text-tg-button-text'
                : 'bg-surface-elevated text-tg-hint hover:bg-surface-hover'
            )}
          >
            <span>{option.label}</span>
            <SortIcon size={14} />
          </motion.button>
        )
      })}
    </div>
  )
}
