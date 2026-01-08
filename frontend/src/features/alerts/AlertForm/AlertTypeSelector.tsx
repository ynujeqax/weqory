import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Activity, Bell, BarChart3, PieChart, Crown } from 'lucide-react'
import { hapticFeedback } from '@telegram-apps/sdk'
import { useTranslation } from 'react-i18next'
import type { AlertType } from '@/types'

interface AlertTypeConfig {
  type: AlertType
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  isPro?: boolean
}

const ALERT_TYPE_CONFIGS: AlertTypeConfig[] = [
  {
    type: 'PRICE_ABOVE',
    icon: TrendingUp,
    color: 'text-green-500',
    bgColor: 'bg-green-500/15',
  },
  {
    type: 'PRICE_BELOW',
    icon: TrendingDown,
    color: 'text-red-500',
    bgColor: 'bg-red-500/15',
  },
  {
    type: 'PRICE_CHANGE_PCT',
    icon: Activity,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/15',
  },
  {
    type: 'PERIODIC',
    icon: Bell,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/15',
  },
  {
    type: 'VOLUME_SPIKE',
    icon: BarChart3,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/15',
    isPro: true,
  },
  {
    type: 'VOLUME_CHANGE_PCT',
    icon: BarChart3,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/15',
    isPro: true,
  },
  {
    type: 'MARKET_CAP_ABOVE',
    icon: PieChart,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/15',
    isPro: true,
  },
  {
    type: 'MARKET_CAP_BELOW',
    icon: PieChart,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/15',
    isPro: true,
  },
]

interface AlertTypeSelectorProps {
  selectedType: AlertType | null
  onSelect: (type: AlertType) => void
}

export function AlertTypeSelector({ selectedType, onSelect }: AlertTypeSelectorProps) {
  const { t } = useTranslation()

  const handleSelect = (type: AlertType) => {
    hapticFeedback.impactOccurred('light')
    onSelect(type)
  }

  return (
    <div className="space-y-3">
      {ALERT_TYPE_CONFIGS.map((config) => {
        const Icon = config.icon
        const isSelected = selectedType === config.type

        return (
          <motion.button
            key={config.type}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelect(config.type)}
            className={`w-full p-4 rounded-xl transition-all ${
              isSelected
                ? 'bg-tg-button/20 border-2 border-tg-button'
                : 'bg-surface hover:bg-surface-elevated border-2 border-transparent'
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`p-3 rounded-xl ${config.bgColor} shrink-0`}>
                <Icon className={`w-6 h-6 ${config.color}`} />
              </div>

              {/* Content */}
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-tg-text">
                    {t(`alerts.types.${config.type}`)}
                  </h3>
                  {config.isPro && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-warning-soft text-warning">
                      <Crown size={10} />
                      Pro
                    </span>
                  )}
                </div>
                <p className="text-sm text-tg-hint">
                  {t(`alerts.descriptions.${config.type}`)}
                </p>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-6 h-6 rounded-full bg-tg-button flex items-center justify-center shrink-0"
                >
                  <div className="w-2 h-2 rounded-full bg-tg-button-text" />
                </motion.div>
              )}
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
