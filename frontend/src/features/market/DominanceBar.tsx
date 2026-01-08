import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface DominanceBarProps {
  btcDominance: number
  ethDominance: number
}

export function DominanceBar({ btcDominance, ethDominance }: DominanceBarProps) {
  const othersDominance = 100 - btcDominance - ethDominance

  const segments = [
    {
      label: 'BTC',
      percentage: btcDominance,
      color: '#F7931A',
      bgColor: 'rgba(247, 147, 26, 0.15)',
    },
    {
      label: 'ETH',
      percentage: ethDominance,
      color: '#627EEA',
      bgColor: 'rgba(98, 126, 234, 0.15)',
    },
    {
      label: 'Others',
      percentage: othersDominance,
      color: '#8E8E93',
      bgColor: 'rgba(142, 142, 147, 0.15)',
    },
  ]

  return (
    <div className="bg-surface rounded-xl px-4 py-4 border border-border-subtle">
      {/* Title */}
      <p className="text-tg-hint text-[11px] uppercase tracking-wide mb-3">
        Market Dominance
      </p>

      {/* Progress bar */}
      <div className="h-2 bg-surface-elevated rounded-full overflow-hidden flex mb-3">
        {segments.map((segment, index) => (
          <motion.div
            key={segment.label}
            className="h-full"
            style={{ backgroundColor: segment.color }}
            initial={{ width: 0 }}
            animate={{ width: `${segment.percentage}%` }}
            transition={{
              duration: 0.8,
              delay: index * 0.1,
              ease: 'easeOut',
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between gap-3">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className={cn(
              'flex items-center gap-2 px-2 py-1 rounded-md flex-1',
              'transition-colors duration-150'
            )}
            style={{ backgroundColor: segment.bgColor }}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: segment.color }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-tg-hint uppercase tracking-wide">
                {segment.label}
              </p>
              <p className="text-body-sm font-mono font-semibold text-tg-text">
                {segment.percentage.toFixed(1)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
