import { cn } from '@/lib/utils'
import { useTelegram } from '@/hooks/useTelegram'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  description?: string
}

export function Toggle({ checked, onChange, disabled, label, description }: ToggleProps) {
  const { hapticFeedback } = useTelegram()

  const handleToggle = () => {
    if (disabled) return
    hapticFeedback('light')
    onChange(!checked)
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4',
        disabled && 'opacity-50'
      )}
    >
      {(label || description) && (
        <div className="flex-1">
          {label && (
            <p className="text-body text-tg-text">{label}</p>
          )}
          {description && (
            <p className="text-body-sm text-tg-hint">{description}</p>
          )}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          'relative w-[51px] h-[31px] rounded-full transition-colors duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-tg-button',
          checked ? 'bg-success' : 'bg-surface-hover'
        )}
      >
        <span
          className={cn(
            'absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white',
            'transition-transform duration-200 shadow-sm',
            checked && 'translate-x-5'
          )}
        />
      </button>
    </div>
  )
}
