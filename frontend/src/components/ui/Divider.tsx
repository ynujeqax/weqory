import { cn } from '@/lib/utils'

interface DividerProps {
  className?: string
  orientation?: 'horizontal' | 'vertical'
  label?: string
}

export function Divider({ className, orientation = 'horizontal', label }: DividerProps) {
  if (label) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-label-sm text-tg-hint">{label}</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'bg-white/10',
        {
          'h-px w-full': orientation === 'horizontal',
          'w-px h-full': orientation === 'vertical',
        },
        className
      )}
    />
  )
}
