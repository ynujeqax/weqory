import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Activity, BarChart3, Bell } from 'lucide-react'
import { hapticFeedback } from '@telegram-apps/sdk'
import type { AlertType } from '@/types'

interface AlertTypeOption {
  type: AlertType
  icon: React.ComponentType<{ className?: string }>
  label: string
  description: string
  color: string
  bgColor: string
}

const ALERT_TYPES: AlertTypeOption[] = [
  {
    type: 'PRICE_ABOVE',
    icon: TrendingUp,
    label: 'Price Above',
    description: 'Alert when price rises above a target',
    color: 'text-green-500',
    bgColor: 'bg-green-500/15',
  },
  {
    type: 'PRICE_BELOW',
    icon: TrendingDown,
    label: 'Price Below',
    description: 'Alert when price drops below a target',
    color: 'text-red-500',
    bgColor: 'bg-red-500/15',
  },
  {
    type: 'PRICE_CHANGE_PCT',
    icon: Activity,
    label: 'Price Change %',
    description: 'Alert on percentage price change',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/15',
  },
  {
    type: 'VOLUME_CHANGE_PCT',
    icon: BarChart3,
    label: 'Volume Change %',
    description: 'Alert on percentage volume change',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/15',
  },
  {
    type: 'VOLUME_SPIKE',
    icon: BarChart3,
    label: 'Volume Spike',
    description: 'Alert on significant volume increase',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/15',
  },
  {
    type: 'PERIODIC',
    icon: Bell,
    label: 'Periodic Update',
    description: 'Regular price updates at intervals',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/15',
  },
]

interface AlertTypeSelectorProps {
  selectedType: AlertType | null
  onSelect: (type: AlertType) => void
}

export function AlertTypeSelector({ selectedType, onSelect }: AlertTypeSelectorProps) {
  const handleSelect = (type: AlertType) => {
    hapticFeedback.impactOccurred('light')
    onSelect(type)
  }

  return (
    <div className="space-y-3">
      {ALERT_TYPES.map((option) => {
        const Icon = option.icon
        const isSelected = selectedType === option.type

        return (
          <motion.button
            key={option.type}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelect(option.type)}
            className={`w-full p-4 rounded-xl transition-all ${
              isSelected
                ? 'bg-tg-button/20 border-2 border-tg-button'
                : 'bg-surface hover:bg-surface-elevated border-2 border-transparent'
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`p-3 rounded-xl ${option.bgColor} shrink-0`}>
                <Icon className={`w-6 h-6 ${option.color}`} />
              </div>

              {/* Content */}
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-tg-text mb-1">{option.label}</h3>
                <p className="text-sm text-tg-hint">{option.description}</p>
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
