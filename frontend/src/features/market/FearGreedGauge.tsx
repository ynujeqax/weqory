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

  // Get emoji based on value
  const emoji = useMemo(() => {
    if (value < 25) return '😨' // Extreme Fear
    if (value < 45) return '😰' // Fear
    if (value < 55) return '😐' // Neutral
    if (value < 75) return '😊' // Greed
    return '🤑' // Extreme Greed
  }, [value])

  // Background gradient based on sentiment
  const backgroundGradient = useMemo(() => {
    if (value < 25) return 'from-[#2d0e0e] via-[#1f0808] to-[#1a0808]'
    if (value < 45) return 'from-[#2d230e] via-[#1f1808] to-[#1a1308]'
    if (value < 55) return 'from-[#1e1e1e] via-[#151515] to-[#101010]'
    return 'from-[#0e2d1a] via-[#081f12] to-[#08150e]'
  }, [value])

  // Rotation for semi-circular gauge (map 0-100 to -90 to 90 degrees)
  const needleRotation = (value / 100) * 180 - 90

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className={cn(
        'relative overflow-hidden bg-gradient-to-br rounded-xl px-4 py-4 border border-white/10',
        backgroundGradient
      )}
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Glow effect */}
      <div
        className="absolute -top-12 -right-12 w-24 h-24 rounded-full blur-3xl opacity-20"
        style={{ backgroundColor: color }}
      />

      <div className="flex flex-col relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-tg-hint text-[11px] uppercase tracking-wide font-medium">
            Fear & Greed Index
          </p>
          <div className="flex items-center gap-2">
            <motion.span
              className="text-2xl"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.5, delay: 0.2, type: 'spring' }}
            >
              {emoji}
            </motion.span>
            <motion.p
              className={cn('font-mono font-bold text-3xl', colorClass)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{
                textShadow: `0 2px 20px ${color}40`,
              }}
            >
              {value}
            </motion.p>
          </div>
        </div>

        {/* Semi-circular Gauge */}
        <div className="relative w-full h-28 mb-3">
          {/* Background arc */}
          <svg className="w-full h-full" viewBox="0 0 200 100">
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FF453A" />
                <stop offset="25%" stopColor="#FFD60A" />
                <stop offset="50%" stopColor="#8E8E93" />
                <stop offset="75%" stopColor="#30D158" />
                <stop offset="100%" stopColor="#34C759" />
              </linearGradient>
            </defs>

            {/* Background track */}
            <motion.path
              d="M 20 90 A 80 80 0 0 1 180 90"
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="12"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />

            {/* Gradient arc */}
            <motion.path
              d="M 20 90 A 80 80 0 0 1 180 90"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />

            {/* Active fill */}
            <motion.path
              d="M 20 90 A 80 80 0 0 1 180 90"
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: value / 100 }}
              transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
              style={{
                filter: `drop-shadow(0 0 8px ${color}80)`,
              }}
            />
          </svg>

          {/* Needle */}
          <motion.div
            className="absolute bottom-0 left-1/2 origin-bottom"
            style={{
              width: '2px',
              height: '70px',
              marginLeft: '-1px',
            }}
            initial={{ rotate: -90 }}
            animate={{ rotate: needleRotation }}
            transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
          >
            <div
              className="w-full h-full rounded-full"
              style={{
                background: `linear-gradient(to top, ${color}, transparent)`,
                boxShadow: `0 0 12px ${color}`,
              }}
            />
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
              style={{
                backgroundColor: color,
                boxShadow: `0 0 8px ${color}`,
              }}
            />
          </motion.div>

          {/* Center pivot */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-surface-elevated border border-white/20" />
        </div>

        {/* Classification badge */}
        <motion.div
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-full self-center',
            value < 25 ? 'bg-crypto-down/10 border border-crypto-down/20' :
            value < 45 ? 'bg-warning/10 border border-warning/20' :
            value < 55 ? 'bg-crypto-neutral/10 border border-crypto-neutral/20' :
            'bg-crypto-up/10 border border-crypto-up/20'
          )}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <p className={cn('text-body-sm font-semibold', colorClass)}>
            {classification}
          </p>
        </motion.div>
      </div>
    </motion.div>
  )
}
