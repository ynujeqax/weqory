import { Toggle } from '@/components/ui/Toggle'
import { AlertPreview } from './AlertPreview'
import type { AlertType, Coin, Timeframe } from '@/types'

interface AlertOptionsProps {
  selectedCoin: Coin
  alertType: AlertType
  conditionValue: string
  conditionTimeframe: Timeframe | null
  periodicInterval: Timeframe | null
  isRecurring: boolean
  onRecurringChange: (recurring: boolean) => void
}

export function AlertOptions({
  selectedCoin,
  alertType,
  conditionValue,
  conditionTimeframe,
  periodicInterval,
  isRecurring,
  onRecurringChange,
}: AlertOptionsProps) {
  // Periodic alerts are always recurring by nature
  const showRecurringToggle = alertType !== 'PERIODIC'

  return (
    <div className="space-y-6">
      {/* Recurring toggle */}
      {showRecurringToggle && (
        <div className="p-4 rounded-xl bg-surface space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-medium text-tg-text mb-1">Recurring Alert</h3>
              <p className="text-sm text-tg-hint">
                Alert will reactivate after triggering
              </p>
            </div>
            <Toggle checked={isRecurring} onChange={onRecurringChange} />
          </div>

          {isRecurring && (
            <div className="p-3 rounded-lg bg-surface-elevated">
              <p className="text-xs text-tg-hint">
                After this alert triggers, it will automatically reset and watch for the
                condition again.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      <div>
        <h3 className="font-medium text-tg-text mb-3">Alert Summary</h3>
        <AlertPreview
          selectedCoin={selectedCoin}
          alertType={alertType}
          conditionValue={conditionValue}
          conditionTimeframe={conditionTimeframe}
          periodicInterval={periodicInterval}
          isRecurring={isRecurring}
        />
      </div>

      {/* Info */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <p className="text-sm text-blue-300">
          You'll receive a notification when this alert triggers. Make sure notifications
          are enabled in your settings.
        </p>
      </div>
    </div>
  )
}
