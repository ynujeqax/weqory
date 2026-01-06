import type { Alert } from '@/types'

interface AlertConditionProps {
  alert: Alert
}

export function AlertCondition({ alert }: AlertConditionProps) {
  const formatCondition = (): string => {
    const { alertType, conditionValue, conditionTimeframe, periodicInterval } = alert

    switch (alertType) {
      case 'PRICE_ABOVE':
        return `Price above $${conditionValue.toLocaleString()}`

      case 'PRICE_BELOW':
        return `Price below $${conditionValue.toLocaleString()}`

      case 'PRICE_CHANGE_PCT':
        return `Price changes ${conditionValue >= 0 ? '+' : ''}${conditionValue}% in ${conditionTimeframe || '24h'}`

      case 'VOLUME_CHANGE_PCT':
        return `Volume changes ${conditionValue >= 0 ? '+' : ''}${conditionValue}% in ${conditionTimeframe || '24h'}`

      case 'VOLUME_SPIKE':
        return 'Significant volume spike detected'

      case 'MARKET_CAP_ABOVE':
        return `Market cap above $${(conditionValue / 1_000_000).toFixed(0)}M`

      case 'MARKET_CAP_BELOW':
        return `Market cap below $${(conditionValue / 1_000_000).toFixed(0)}M`

      case 'PERIODIC':
        return `Update every ${periodicInterval || '1h'}`

      default:
        return 'Unknown condition'
    }
  }

  return (
    <p className="text-sm text-gray-300">
      {formatCondition()}
    </p>
  )
}
