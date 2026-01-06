import { motion } from 'framer-motion'
import { Layers, Bell, Megaphone } from 'lucide-react'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { User, UserLimits } from '@/types'

interface UsageStatsProps {
  user: User
  limits: UserLimits
}

export function UsageStats({ user, limits }: UsageStatsProps) {
  const { coinsUsed, alertsUsed, maxCoins, maxAlerts, maxNotifications } = limits
  const { notificationsUsed } = user

  const stats = [
    {
      icon: Layers,
      label: 'Coins in Watchlist',
      current: coinsUsed,
      max: maxCoins,
    },
    {
      icon: Bell,
      label: 'Active Alerts',
      current: alertsUsed,
      max: maxAlerts,
    },
    {
      icon: Megaphone,
      label: 'Notifications This Month',
      current: notificationsUsed,
      max: maxNotifications,
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-surface rounded-lg p-4 space-y-4"
    >
      <h3 className="text-label font-semibold text-tg-text">Usage Stats</h3>

      <div className="space-y-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            className="space-y-2"
          >
            {/* Label + Icon */}
            <div className="flex items-center gap-2">
              <stat.icon size={16} className="text-tg-hint" />
              <span className="text-body text-tg-text">{stat.label}</span>
            </div>

            {/* Progress bar */}
            <ProgressBar current={stat.current} max={stat.max} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
