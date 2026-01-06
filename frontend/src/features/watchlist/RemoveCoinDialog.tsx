import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import type { Coin } from '@/types'

interface RemoveCoinDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  coin: Coin
  alertsCount: number
}

export function RemoveCoinDialog({
  isOpen,
  onClose,
  onConfirm,
  coin,
  alertsCount,
}: RemoveCoinDialogProps) {
  const hasAlerts = alertsCount > 0

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Remove from Watchlist?"
      message={
        hasAlerts
          ? `Removing ${coin.symbol} will also delete ${alertsCount} active ${alertsCount === 1 ? 'alert' : 'alerts'}. This action cannot be undone.`
          : `Are you sure you want to remove ${coin.symbol} from your watchlist?`
      }
      confirmText="Remove"
      cancelText="Cancel"
      variant="danger"
    />
  )
}
