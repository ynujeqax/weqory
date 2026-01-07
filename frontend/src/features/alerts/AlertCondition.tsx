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
        return `Price changes ${conditionValue}% in ${conditionTimeframe || '24h'}`

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
