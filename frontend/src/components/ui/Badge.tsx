import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium',
        // Size variants
        {
          'px-2 py-0.5 text-[10px]': size === 'sm',
          'px-2.5 py-1 text-[11px]': size === 'md',
        },
        // Color variants
        {
          'bg-surface-elevated text-tg-text': variant === 'default',
          'bg-tg-button/20 text-tg-button': variant === 'primary',
          'bg-success-soft text-success': variant === 'success',
          'bg-warning-soft text-warning': variant === 'warning',
          'bg-danger-soft text-danger': variant === 'danger',
          'bg-surface-elevated text-tg-hint': variant === 'neutral',
        },
        className
      )}
    >
      {children}
    </span>
  )
}
