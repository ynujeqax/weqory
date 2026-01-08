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

  // Calculate arc position (0-100 maps to 0-180 degrees)
  const rotation = (value / 100) * 180 - 90 // -90 to 90 degrees

  return (
    <div className="bg-surface rounded-xl px-4 py-4 border border-border-subtle">
      <div className="flex flex-col items-center">
        {/* Label */}
        <p className="text-tg-hint text-[11px] uppercase tracking-wide mb-3">
          Fear & Greed Index
        </p>

        {/* Semi-circular gauge */}
        <div className="relative w-36 h-20 mb-2">
          {/* Background arc (gradient) */}
          <svg className="absolute inset-0" viewBox="0 0 144 80" fill="none">
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FF453A" />
                <stop offset="25%" stopColor="#FFD60A" />
                <stop offset="50%" stopColor="#8E8E93" />
                <stop offset="75%" stopColor="#30D158" />
                <stop offset="100%" stopColor="#30D158" />
              </linearGradient>
            </defs>
            <path
              d="M 12 72 A 60 60 0 0 1 132 72"
              stroke="url(#gaugeGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
              opacity="0.3"
            />
          </svg>

          {/* Active arc */}
          <svg className="absolute inset-0" viewBox="0 0 144 80" fill="none">
            <motion.path
              d="M 12 72 A 60 60 0 0 1 132 72"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="188.5"
              initial={{ strokeDashoffset: 188.5 }}
              animate={{ strokeDashoffset: 188.5 - (value / 100) * 188.5 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </svg>

          {/* Needle */}
          <div className="absolute inset-0 flex items-end justify-center pb-2">
            <motion.div
              className="w-1 h-12 origin-bottom"
              style={{
                background: `linear-gradient(to top, ${color}, transparent)`,
              }}
              initial={{ rotate: -90 }}
              animate={{ rotate: rotation }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>

          {/* Center value */}
          <div className="absolute inset-0 flex items-end justify-center pb-1">
            <motion.p
              className={cn('font-mono font-bold text-3xl', colorClass)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {value}
            </motion.p>
          </div>
        </div>

        {/* Classification */}
        <p className="text-body font-medium text-tg-text">{classification}</p>
      </div>
    </div>
  )
}
