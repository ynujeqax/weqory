import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AltcoinSeasonCardProps {
  btcDominance: number
}

export function AltcoinSeasonCard({ btcDominance }: AltcoinSeasonCardProps) {
  // Derive altcoin season index from BTC dominance
  // Formula: Higher BTC dominance = Bitcoin season (lower index)
  // BTC dominance typically ranges from 35% to 75%
  // Map: 75% dominance = 0 index, 35% dominance = 100 index
  const altcoinSeasonIndex = useMemo(() => {
    if (!btcDominance || btcDominance <= 0) return 50 // Default to neutral
    // Inverse relationship: high BTC dominance = low index (Bitcoin season)
    // Clamp btcDominance between 35 and 75 for calculation
    const clampedDominance = Math.max(35, Math.min(75, btcDominance))
    const normalized = ((75 - clampedDominance) / 40) * 100
    return Math.round(normalized)
  }, [btcDominance])

  const isBitcoinSeason = altcoinSeasonIndex < 50
  const season = isBitcoinSeason ? 'Bitcoin Season' : 'Altcoin Season'

  // Color gradient based on index
  const progressColor = useMemo(() => {
    if (altcoinSeasonIndex < 25) return '#FF9500' // Bitcoin season - orange
    if (altcoinSeasonIndex < 50) return '#FFD60A' // Leaning Bitcoin - yellow
    if (altcoinSeasonIndex < 75) return '#30D158' // Leaning Altcoin - green
    return '#34C759' // Altcoin season - bright green
  }, [altcoinSeasonIndex])

  const textColor = useMemo(() => {
    if (altcoinSeasonIndex < 50) return 'text-warning'
    return 'text-crypto-up'
  }, [altcoinSeasonIndex])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="bg-surface rounded-xl px-4 py-4 border border-border-subtle"
    >
      {/* Label */}
      <p className="text-tg-hint text-[11px] uppercase tracking-wide mb-2">
        Altcoin Season Index
      </p>

      {/* Value */}
      <motion.p
        className={cn('font-mono font-bold text-[32px] leading-none mb-2', textColor)}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        {altcoinSeasonIndex}/100
      </motion.p>

      {/* Progress Bar */}
      <motion.div
        className="w-full h-1.5 bg-surface-elevated rounded-full mb-2 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: progressColor }}
          initial={{ width: 0 }}
          animate={{ width: `${altcoinSeasonIndex}%` }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
        />
      </motion.div>

      {/* Season Indicator */}
      <motion.p
        className={cn('text-body-sm font-medium', textColor)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        {season}
      </motion.p>
    </motion.div>
  )
}
