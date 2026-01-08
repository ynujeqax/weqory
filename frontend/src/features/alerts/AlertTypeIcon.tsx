import { TrendingUp, TrendingDown, Activity, Bell, BarChart3, PieChart } from 'lucide-react'
import type { AlertType } from '@/types'

interface AlertTypeIconProps {
  alertType: AlertType
  className?: string
}

const ALERT_TYPE_CONFIG: Record<AlertType, { Icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
  PRICE_ABOVE: {
    Icon: TrendingUp,
    color: 'text-green-500',
    bgColor: 'bg-green-500/15',
  },
  PRICE_BELOW: {
    Icon: TrendingDown,
    color: 'text-red-500',
    bgColor: 'bg-red-500/15',
  },
  PRICE_CHANGE_PCT: {
    Icon: Activity,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/15',
  },
  PERIODIC: {
    Icon: Bell,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/15',
  },
  VOLUME_SPIKE: {
    Icon: BarChart3,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/15',
  },
  VOLUME_CHANGE_PCT: {
    Icon: BarChart3,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/15',
  },
  MARKET_CAP_ABOVE: {
    Icon: PieChart,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/15',
  },
  MARKET_CAP_BELOW: {
    Icon: PieChart,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/15',
  },
}

export function AlertTypeIcon({ alertType, className = 'w-5 h-5' }: AlertTypeIconProps) {
  const config = ALERT_TYPE_CONFIG[alertType]
  const { Icon, color, bgColor } = config

  return (
    <div className={`p-2 rounded-lg ${bgColor}`}>
      <Icon className={`${className} ${color}`} />
    </div>
  )
}
