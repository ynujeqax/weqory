import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption<T = string> {
  value: T
  label: string
  disabled?: boolean
}

interface SelectProps<T = string> {
  value: T
  onChange: (value: T) => void
  options: SelectOption<T>[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function Select<T = string>({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className,
  disabled = false,
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (option: SelectOption<T>) => {
    if (!option.disabled) {
      onChange(option.value)
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between gap-2',
          'px-4 py-3 rounded-lg',
          'bg-surface border border-white/10',
          'text-body text-tg-text',
          'transition-all duration-200',
          'touch-feedback',
          {
            'opacity-50 cursor-not-allowed': disabled,
            'hover:border-white/20': !disabled,
            'border-tg-link': isOpen,
          }
        )}
      >
        <span className={cn(!selectedOption && 'text-tg-hint')}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          size={18}
          className={cn(
            'text-tg-hint transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 w-full mt-2',
              'bg-surface-elevated border border-white/10 rounded-lg',
              'shadow-modal overflow-hidden'
            )}
          >
            <div className="max-h-60 overflow-y-auto py-1">
              {options.map((option, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelect(option)}
                  disabled={option.disabled}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-4 py-2.5',
                    'text-body text-left',
                    'transition-colors',
                    {
                      'text-tg-text hover:bg-surface-hover': !option.disabled,
                      'text-tg-hint cursor-not-allowed': option.disabled,
                      'bg-surface-hover': option.value === value,
                    }
                  )}
                >
                  <span>{option.label}</span>
                  {option.value === value && (
                    <Check size={16} className="text-tg-link" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
