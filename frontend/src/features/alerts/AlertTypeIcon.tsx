import { TrendingUp, TrendingDown, Activity, BarChart3, Bell, DollarSign } from 'lucide-react'
import type { AlertType } from '@/types'

interface AlertTypeIconProps {
  alertType: AlertType
  className?: string
}

export function AlertTypeIcon({ alertType, className = 'w-5 h-5' }: AlertTypeIconProps) {
  const getIconConfig = () => {
    switch (alertType) {
      case 'PRICE_ABOVE':
        return {
          Icon: TrendingUp,
          color: 'text-green-500',
          bgColor: 'bg-green-500/15',
        }
      case 'PRICE_BELOW':
        return {
          Icon: TrendingDown,
          color: 'text-red-500',
          bgColor: 'bg-red-500/15',
        }
      case 'PRICE_CHANGE_PCT':
        return {
          Icon: Activity,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/15',
        }
      case 'VOLUME_CHANGE_PCT':
        return {
          Icon: BarChart3,
          color: 'text-purple-500',
          bgColor: 'bg-purple-500/15',
        }
      case 'VOLUME_SPIKE':
        return {
          Icon: BarChart3,
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/15',
        }
      case 'MARKET_CAP_ABOVE':
        return {
          Icon: DollarSign,
          color: 'text-green-500',
          bgColor: 'bg-green-500/15',
        }
      case 'MARKET_CAP_BELOW':
        return {
          Icon: DollarSign,
          color: 'text-red-500',
          bgColor: 'bg-red-500/15',
        }
      case 'PERIODIC':
        return {
          Icon: Bell,
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/15',
        }
    }
  }

  const { Icon, color, bgColor } = getIconConfig()

  return (
    <div className={`p-2 rounded-lg ${bgColor}`}>
      <Icon className={`${className} ${color}`} />
    </div>
  )
}
