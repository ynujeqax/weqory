import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Bitcoin, Coins } from 'lucide-react'
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

  // Background gradient changes based on season
  const backgroundGradient = useMemo(() => {
    if (isBitcoinSeason) {
      return 'from-[#2d1f0e] via-[#1f1508] to-[#1a1308]'
    }
    return 'from-[#0e2d1a] via-[#081f12] to-[#08150e]'
  }, [isBitcoinSeason])

  const glowColor = useMemo(() => {
    if (isBitcoinSeason) return 'rgba(255, 149, 0, 0.3)'
    return 'rgba(48, 209, 88, 0.3)'
  }, [isBitcoinSeason])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className={cn(
        'relative overflow-hidden bg-gradient-to-br rounded-xl px-4 py-4 border border-white/10',
        backgroundGradient
      )}
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Decorative icon */}
      <div className="absolute top-0 right-0 w-28 h-28 opacity-5">
        {isBitcoinSeason ? (
          <Bitcoin size={112} className="text-warning" />
        ) : (
          <Coins size={112} className="text-crypto-up" />
        )}
      </div>

      {/* Glow effect */}
      <div
        className="absolute -top-12 -right-12 w-24 h-24 rounded-full blur-3xl"
        style={{ backgroundColor: glowColor }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Label */}
        <p className="text-tg-hint text-[11px] uppercase tracking-wide mb-2 font-medium">
          Altcoin Season Index
        </p>

        {/* Value with icon */}
        <div className="flex items-center gap-2 mb-3">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.1, type: 'spring', stiffness: 200 }}
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              isBitcoinSeason
                ? 'bg-warning/10 border border-warning/20'
                : 'bg-crypto-up/10 border border-crypto-up/20'
            )}
          >
            {isBitcoinSeason ? (
              <Bitcoin size={20} className="text-warning" />
            ) : (
              <Coins size={20} className="text-crypto-up" />
            )}
          </motion.div>

          <motion.p
            className={cn('font-mono font-bold text-[36px] leading-none', textColor)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            style={{
              textShadow: `0 2px 20px ${progressColor}40`,
            }}
          >
            {altcoinSeasonIndex}
          </motion.p>
          <span className="font-mono font-bold text-[20px] text-tg-hint self-end mb-1">/100</span>
        </div>

        {/* Enhanced Progress Bar */}
        <motion.div
          className="relative w-full h-3 bg-black/30 rounded-full mb-2.5 overflow-hidden border border-white/5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {/* Background gradient track */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to right, #FF9500 0%, #FFD60A 40%, #30D158 60%, #34C759 100%)',
              opacity: 0.2,
            }}
          />

          {/* Progress fill */}
          <motion.div
            className="h-full rounded-full relative"
            style={{
              backgroundColor: progressColor,
              boxShadow: `0 0 12px ${progressColor}80`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${altcoinSeasonIndex}%` }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          >
            {/* Glowing edge */}
            <div
              className="absolute right-0 top-0 bottom-0 w-1 rounded-full"
              style={{
                backgroundColor: progressColor,
                boxShadow: `0 0 8px ${progressColor}`,
              }}
            />
          </motion.div>
        </motion.div>

        {/* Season Indicator with badge */}
        <motion.div
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
            isBitcoinSeason
              ? 'bg-warning/10 border border-warning/20'
              : 'bg-crypto-up/10 border border-crypto-up/20'
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <span className={cn('text-body-sm font-semibold', textColor)}>
            {season}
          </span>
        </motion.div>
      </div>
    </motion.div>
  )
}
