import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface FearGreedGaugeProps {
  value: number
  classification: string
}

export function FearGreedGauge({ value, classification }: FearGreedGaugeProps) {
  // Get color based on value
  const color = useMemo(() => {
    if (value < 25) return '#FF453A' // Extreme Fear
    if (value < 45) return '#FFD60A' // Fear
    if (value < 55) return '#8E8E93' // Neutral
    if (value < 75) return '#30D158' // Greed
    return '#30D158' // Extreme Greed
  }, [value])

  const colorClass = useMemo(() => {
    if (value < 25) return 'text-crypto-down'
    if (value < 45) return 'text-warning'
    if (value < 55) return 'text-crypto-neutral'
    return 'text-crypto-up'
  }, [value])

  return (
    <div className="bg-surface rounded-lg px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Label */}
        <div className="flex-1">
          <p className="text-tg-hint text-[11px] uppercase tracking-wide mb-0.5">
            Fear & Greed
          </p>
          <p className="text-body-sm text-tg-text">{classification}</p>
        </div>

        {/* Value with progress bar */}
        <div className="flex items-center gap-3">
          {/* Compact horizontal bar */}
          <div className="relative w-24 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
            <div
              className={cn('absolute left-0 top-0 h-full rounded-full transition-all duration-500')}
              style={{
                width: `${value}%`,
                backgroundColor: color
              }}
            />
          </div>

          {/* Value */}
          <p className={cn('font-mono font-semibold text-label-lg min-w-[2.5rem] text-right', colorClass)}>
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}
