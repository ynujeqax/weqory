import { motion } from 'framer-motion'
import { CheckCircle2, XCircle } from 'lucide-react'
import { CoinLogo } from '@/components/common/CoinLogo'
import { formatPrice, formatDate } from '@/lib/utils'
import type { AlertHistoryItem } from '@/api/history'

interface HistoryCardProps {
  item: AlertHistoryItem
}

const alertTypeLabels: Record<string, string> = {
  PRICE_ABOVE: 'Price Above',
  PRICE_BELOW: 'Price Below',
  PRICE_CHANGE_PCT: 'Price Change',
  VOLUME_CHANGE_PCT: 'Volume Change',
  VOLUME_SPIKE: 'Volume Spike',
  MARKET_CAP_ABOVE: 'Market Cap Above',
  MARKET_CAP_BELOW: 'Market Cap Below',
  PERIODIC: 'Periodic',
}

const conditionOperatorLabels: Record<string, string> = {
  above: 'Above',
  below: 'Below',
  change: 'Change',
}

export function HistoryCard({ item }: HistoryCardProps) {
  const { coin, alert_type, condition_operator, condition_value, triggered_price, triggered_at } = item
  const notificationSent = item.id % 2 === 0 // Mock notification status for demo

  const getConditionText = () => {
    const type = alertTypeLabels[alert_type] || alert_type
    const operator = conditionOperatorLabels[condition_operator] || condition_operator

    if (alert_type === 'PRICE_CHANGE_PCT' || alert_type === 'VOLUME_CHANGE_PCT') {
      return `${type} ${operator} ${condition_value}%`
    }

    if (alert_type === 'PERIODIC') {
      return 'Periodic Alert'
    }

    return `${type} ${formatPrice(condition_value)}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-surface rounded-lg p-4"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Coin + Alert info */}
        <div className="flex items-start gap-3 flex-1">
          <CoinLogo symbol={coin.symbol} name={coin.name} size="md" />

          <div className="flex-1 min-w-0">
            {/* Coin name */}
            <div className="flex items-center gap-2 mb-1">
              <p className="text-label font-semibold text-tg-text">
                {coin.symbol}
              </p>
              <span className="text-body-sm text-tg-hint">
                {coin.name}
              </span>
            </div>

            {/* Alert condition */}
            <p className="text-body-sm text-tg-hint mb-2">
              {getConditionText()}
            </p>

            {/* Triggered price + time */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-label-sm font-mono font-semibold text-tg-text">
                {formatPrice(triggered_price)}
              </div>
              <div className="text-body-sm text-tg-hint">
                {formatDate(triggered_at)}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Notification status */}
        <div className="flex-shrink-0">
          {notificationSent ? (
            <div className="flex items-center gap-1.5 text-success">
              <CheckCircle2 size={16} />
              <span className="text-label-sm font-medium">Sent</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-danger">
              <XCircle size={16} />
              <span className="text-label-sm font-medium">Failed</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
