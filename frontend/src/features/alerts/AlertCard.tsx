import { memo, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Pause, Play, Trash2, Clock } from 'lucide-react'
import { hapticFeedback } from '@telegram-apps/sdk'
import { AlertTypeIcon } from './AlertTypeIcon'
import { AlertStatusBadge } from './AlertStatusBadge'
import { AlertCondition } from './AlertCondition'
import type { Alert } from '@/types'
import { formatDistanceToNow } from 'date-fns'

interface AlertCardProps {
  alert: Alert
  onPause: (id: string) => void
  onDelete: (id: string) => void
}

function AlertCardComponent({ alert, onPause, onDelete }: AlertCardProps) {
  const handlePause = useCallback(() => {
    hapticFeedback.impactOccurred('light')
    onPause(alert.id.toString())
  }, [alert.id, onPause])

  const handleDelete = useCallback(() => {
    hapticFeedback.impactOccurred('medium')
    onDelete(alert.id.toString())
  }, [alert.id, onDelete])

  const isRecentlyTriggered = useMemo(() =>
    alert.lastTriggeredAt &&
    new Date().getTime() - new Date(alert.lastTriggeredAt).getTime() < 5 * 60 * 1000,
    [alert.lastTriggeredAt]
  )

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="bg-surface rounded-xl p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <AlertTypeIcon alertType={alert.alertType} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-tg-text truncate">
                {alert.coin.symbol}
              </h3>
              <AlertStatusBadge isPaused={alert.isPaused} isTriggered={!!isRecentlyTriggered} />
            </div>
            <p className="text-xs text-tg-hint truncate mb-1">{alert.coin.name}</p>
            <AlertCondition alert={alert} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handlePause}
            className="p-2 rounded-lg bg-surface-elevated hover:bg-surface-hover transition-colors"
          >
            {alert.isPaused ? (
              <Play className="w-4 h-4 text-green-500" />
            ) : (
              <Pause className="w-4 h-4 text-yellow-500" />
            )}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleDelete}
            className="p-2 rounded-lg bg-surface-elevated hover:bg-danger-soft transition-colors"
          >
            <Trash2 className="w-4 h-4 text-danger" />
          </motion.button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-tg-hint pt-2 border-t border-white/5">
        <div className="flex items-center gap-4">
          <span>
            Triggered <span className="font-semibold text-tg-text">{alert.timesTriggered}x</span>
          </span>
          {alert.isRecurring && (
            <span className="text-blue-400">Recurring</span>
          )}
        </div>
        {alert.lastTriggeredAt && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatDistanceToNow(new Date(alert.lastTriggeredAt), { addSuffix: true })}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Memoize to prevent unnecessary re-renders
export const AlertCard = memo(AlertCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.alert.id === nextProps.alert.id &&
    prevProps.alert.isPaused === nextProps.alert.isPaused &&
    prevProps.alert.timesTriggered === nextProps.alert.timesTriggered &&
    prevProps.alert.lastTriggeredAt === nextProps.alert.lastTriggeredAt
  )
})
