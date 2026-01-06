import { AlertTypeIcon } from '../AlertTypeIcon'
import { Badge } from '@/components/ui/Badge'
import { Repeat } from 'lucide-react'
import type { AlertType, Coin, Timeframe } from '@/types'

interface AlertPreviewProps {
  selectedCoin: Coin
  alertType: AlertType
  conditionValue: string
  conditionTimeframe: Timeframe | null
  periodicInterval: Timeframe | null
  isRecurring: boolean
}

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  '5m': '5 minutes',
  '15m': '15 minutes',
  '30m': '30 minutes',
  '1h': '1 hour',
  '4h': '4 hours',
  '24h': '24 hours',
}

export function AlertPreview({
  selectedCoin,
  alertType,
  conditionValue,
  conditionTimeframe,
  periodicInterval,
  isRecurring,
}: AlertPreviewProps) {
  const formatCondition = (): string => {
    const value = parseFloat(conditionValue)

    switch (alertType) {
      case 'PRICE_ABOVE':
        return `Price rises above $${value.toLocaleString()}`

      case 'PRICE_BELOW':
        return `Price drops below $${value.toLocaleString()}`

      case 'PRICE_CHANGE_PCT':
        return `Price changes ${value >= 0 ? '+' : ''}${value}% in ${conditionTimeframe ? TIMEFRAME_LABELS[conditionTimeframe] : '...'}`

      case 'VOLUME_CHANGE_PCT':
        return `Volume changes ${value >= 0 ? '+' : ''}${value}% in ${conditionTimeframe ? TIMEFRAME_LABELS[conditionTimeframe] : '...'}`

      case 'VOLUME_SPIKE':
        return 'Significant volume spike detected'

      case 'MARKET_CAP_ABOVE':
        return `Market cap rises above $${(value / 1_000_000).toFixed(0)}M`

      case 'MARKET_CAP_BELOW':
        return `Market cap drops below $${(value / 1_000_000).toFixed(0)}M`

      case 'PERIODIC':
        return `Regular updates every ${periodicInterval ? TIMEFRAME_LABELS[periodicInterval] : '...'}`

      default:
        return ''
    }
  }

  return (
    <div className="p-4 rounded-xl bg-surface border border-white/5">
      <div className="flex items-start gap-3">
        <AlertTypeIcon alertType={alertType} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-tg-text">{selectedCoin.symbol}</h3>
            {(isRecurring || alertType === 'PERIODIC') && (
              <Badge variant="default" size="sm" className="gap-1">
                <Repeat className="w-3 h-3" />
                Recurring
              </Badge>
            )}
          </div>
          <p className="text-xs text-tg-hint mb-2">{selectedCoin.name}</p>
          <p className="text-sm text-gray-300">{formatCondition()}</p>
        </div>
      </div>
    </div>
  )
}
