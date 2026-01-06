import { useMemo } from 'react'
import { motion } from 'framer-motion'

interface FearGreedGaugeProps {
  value: number
  classification: string
}

export function FearGreedGauge({ value, classification }: FearGreedGaugeProps) {
  // Map value (0-100) to rotation (-90 to 90 degrees)
  const rotation = useMemo(() => {
    return (value / 100) * 180 - 90
  }, [value])

  // Get color based on value
  const color = useMemo(() => {
    if (value < 25) return '#FF453A' // Extreme Fear
    if (value < 45) return '#FFD60A' // Fear
    if (value < 55) return '#8E8E93' // Neutral
    if (value < 75) return '#30D158' // Greed
    return '#30D158' // Extreme Greed
  }, [value])

  return (
    <div className="bg-surface rounded-lg p-4">
      {/* Title */}
      <h3 className="text-label text-tg-hint mb-4 text-center">
        Fear & Greed Index
      </h3>

      {/* Gauge */}
      <div className="relative w-48 h-24 mx-auto">
        {/* Background arc */}
        <svg className="w-full h-full" viewBox="0 0 200 100">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF453A" />
              <stop offset="25%" stopColor="#FFD60A" />
              <stop offset="50%" stopColor="#8E8E93" />
              <stop offset="75%" stopColor="#30D158" />
              <stop offset="100%" stopColor="#30D158" />
            </linearGradient>
          </defs>

          {/* Background arc */}
          <path
            d="M 20 90 A 80 80 0 0 1 180 90"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.3"
          />

          {/* Active arc */}
          <motion.path
            d="M 20 90 A 80 80 0 0 1 180 90"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: value / 100 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>

        {/* Needle */}
        <motion.div
          className="absolute top-[70px] left-1/2 -ml-1 origin-bottom"
          style={{ height: '60px' }}
          initial={{ rotate: -90 }}
          animate={{ rotate: rotation }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <div className="w-1 h-full bg-white rounded-full shadow-lg" />
          <div className="absolute bottom-0 left-1/2 -ml-2 w-4 h-4 rounded-full bg-white shadow-lg" />
        </motion.div>
      </div>

      {/* Value and classification */}
      <div className="text-center mt-4">
        <motion.p
          key={value}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-[32px] leading-tight font-bold text-tg-text mb-1"
          style={{ color }}
        >
          {value}
        </motion.p>
        <p className="text-body text-tg-hint">{classification}</p>
      </div>
    </div>
  )
}
