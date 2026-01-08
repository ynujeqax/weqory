import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { usePricesStore } from '@/stores/pricesStore'
import type { AlertType, Timeframe, Coin } from '@/types'

interface ConditionInputProps {
  alertType: AlertType
  selectedCoin: Coin
  conditionValue: string
  conditionTimeframe: Timeframe | null
  periodicInterval: Timeframe | null
  onValueChange: (value: string) => void
  onTimeframeChange: (timeframe: Timeframe | null) => void
  onPeriodicIntervalChange: (interval: Timeframe | null) => void
}

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: '5m', label: '5 minutes' },
  { value: '15m', label: '15 minutes' },
  { value: '30m', label: '30 minutes' },
  { value: '1h', label: '1 hour' },
  { value: '4h', label: '4 hours' },
  { value: '24h', label: '24 hours' },
]

export function ConditionInput({
  alertType,
  selectedCoin,
  conditionValue,
  conditionTimeframe,
  periodicInterval,
  onValueChange,
  onTimeframeChange,
  onPeriodicIntervalChange,
}: ConditionInputProps) {
  const prices = usePricesStore((state) => state.prices)
  const currentPrice = prices.get(selectedCoin.symbol)?.price
  const [error, setError] = useState<string>('')

  useEffect(() => {
    setError('')
  }, [conditionValue, alertType])

  const validateValue = (value: string) => {
    if (!value) {
      setError('')
      return
    }

    const num = parseFloat(value)

    if (isNaN(num)) {
      setError('Please enter a valid number')
      return
    }

    if (num <= 0) {
      setError('Value must be greater than 0')
      return
    }

    if (alertType === 'PRICE_CHANGE_PCT' && num > 100) {
      setError('Percentage must be between 0% and 100%')
      return
    }

    setError('')
  }

  const handleValueChange = (value: string) => {
    onValueChange(value)
    validateValue(value)
  }

  // Periodic alert - only interval selector
  if (alertType === 'PERIODIC') {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-tg-text mb-2">
            Update Interval
          </label>
          <Select
            value={periodicInterval || ''}
            onChange={(value) => onPeriodicIntervalChange(value as Timeframe)}
            options={TIMEFRAMES.map((tf) => ({ value: tf.value, label: tf.label }))}
            placeholder="Select interval..."
          />
        </div>

        <div className="p-4 rounded-xl bg-surface-elevated">
          <p className="text-sm text-tg-hint">
            You'll receive regular price updates for {selectedCoin.symbol} every{' '}
            {periodicInterval ? TIMEFRAMES.find((t) => t.value === periodicInterval)?.label : '...'}
          </p>
        </div>
      </div>
    )
  }

  // Percentage change alerts (price or volume)
  if (alertType === 'PRICE_CHANGE_PCT' || alertType === 'VOLUME_CHANGE_PCT') {
    const isVolume = alertType === 'VOLUME_CHANGE_PCT'
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-tg-text mb-2">
            {isVolume ? 'Volume Change' : 'Price Change'} Percentage
          </label>
          <Input
            type="number"
            value={conditionValue}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="e.g., 5"
            step="0.1"
            min="0"
            error={error}
          />
          <p className="text-xs text-tg-hint mt-1">
            Triggers on {isVolume ? 'volume' : 'price'} change in either direction (up or down)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-tg-text mb-2">
            Timeframe
          </label>
          <Select
            value={conditionTimeframe || ''}
            onChange={(value) => onTimeframeChange(value as Timeframe)}
            options={TIMEFRAMES.map((tf) => ({ value: tf.value, label: tf.label }))}
            placeholder="Select timeframe..."
          />
        </div>

        {conditionValue && conditionTimeframe && !error && (
          <div className="p-4 rounded-xl bg-surface-elevated">
            <p className="text-sm text-tg-hint">
              Alert when {isVolume ? 'volume' : 'price'} changes by {conditionValue}% or more within{' '}
              {TIMEFRAMES.find((t) => t.value === conditionTimeframe)?.label}
            </p>
          </div>
        )}
      </div>
    )
  }

  // Volume spike alert
  if (alertType === 'VOLUME_SPIKE') {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-tg-text mb-2">
            Spike Threshold (% of average)
          </label>
          <Input
            type="number"
            value={conditionValue}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="e.g., 200"
            step="10"
            min="100"
            error={error}
          />
          <p className="text-xs text-tg-hint mt-1">
            E.g., 200 means alert when volume is 2x the 7-day average
          </p>
        </div>

        {conditionValue && !error && (
          <div className="p-4 rounded-xl bg-surface-elevated">
            <p className="text-sm text-tg-hint">
              Alert when {selectedCoin.symbol} trading volume exceeds {conditionValue}% of the 7-day average
            </p>
          </div>
        )}
      </div>
    )
  }

  // Price/Market cap alerts
  const isPriceAlert = alertType === 'PRICE_ABOVE' || alertType === 'PRICE_BELOW'

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-tg-text mb-2">
          {isPriceAlert ? 'Target Price' : 'Target Market Cap'}
        </label>
        <Input
          type="number"
          value={conditionValue}
          onChange={(e) => handleValueChange(e.target.value)}
          placeholder={isPriceAlert ? 'e.g., 100000' : 'e.g., 1000000000'}
          step={isPriceAlert ? '0.01' : '1000000'}
          error={error}
        />
        {isPriceAlert && currentPrice && (
          <p className="text-xs text-tg-hint mt-1">
            Current price: ${currentPrice.toLocaleString()}
          </p>
        )}
      </div>

      {conditionValue && !error && (
        <div className="p-4 rounded-xl bg-surface-elevated">
          <p className="text-sm text-tg-hint">
            Alert when {selectedCoin.symbol}{' '}
            {isPriceAlert ? 'price' : 'market cap'}{' '}
            {alertType.includes('ABOVE') ? 'rises above' : 'drops below'}{' '}
            {isPriceAlert
              ? `$${parseFloat(conditionValue).toLocaleString()}`
              : `$${(parseFloat(conditionValue) / 1_000_000).toFixed(0)}M`}
          </p>
        </div>
      )}
    </div>
  )
}
