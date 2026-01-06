import { useState, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { debounce } from '@/lib/utils'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  debounceMs?: number
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  debounceMs = 300,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value)

  const debouncedOnChange = useCallback(
    debounce((value: string) => {
      onChange(value)
    }, debounceMs),
    [onChange, debounceMs]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    debouncedOnChange(newValue)
  }

  const handleClear = () => {
    setLocalValue('')
    onChange('')
  }

  return (
    <div className={cn('relative', className)}>
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-tg-hint pointer-events-none"
      />
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          'w-full pl-11 pr-11 py-3 rounded-lg',
          'bg-surface border border-white/10',
          'text-body text-tg-text placeholder:text-tg-hint',
          'focus:outline-none focus:border-tg-link',
          'transition-colors'
        )}
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-surface-hover transition-colors touch-feedback"
        >
          <X size={16} className="text-tg-hint" />
        </button>
      )}
    </div>
  )
}
