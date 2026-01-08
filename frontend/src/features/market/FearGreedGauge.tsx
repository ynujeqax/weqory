import { useMemo } from 'react'
import { motion } from 'framer-motion'
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="bg-surface rounded-xl px-4 py-4 border border-border-subtle"
    >
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-tg-hint text-[11px] uppercase tracking-wide">
            Fear & Greed Index
          </p>
          <motion.p
            className={cn('font-mono font-bold text-2xl', colorClass)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {value}
          </motion.p>
        </div>

        {/* Horizontal Bar */}
        <div className="relative w-full h-3 bg-surface-elevated rounded-full overflow-hidden mb-2">
          {/* Background gradient */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(to right, #FF453A 0%, #FFD60A 25%, #8E8E93 50%, #30D158 75%, #30D158 100%)',
              opacity: 0.3,
            }}
          />

          {/* Progress indicator */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-1 h-5 rounded-full shadow-lg"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 12px ${color}`,
            }}
            initial={{ left: '0%' }}
            animate={{ left: `${value}%` }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          />
        </div>

        {/* Classification */}
        <p className={cn('text-body-sm font-semibold', colorClass)}>
          {classification}
        </p>
      </div>
    </motion.div>
  )
}
