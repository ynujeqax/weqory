import { TrendingUp, TrendingDown, Activity, Bell } from 'lucide-react'
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
