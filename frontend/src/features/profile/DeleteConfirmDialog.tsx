import { ConfirmDialog } from '@/components/common/ConfirmDialog'

interface DeleteConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  type: 'watchlist' | 'alerts' | 'history'
  isLoading?: boolean
}

const dialogContent = {
  watchlist: {
    title: 'Delete All Watchlist?',
    message: 'This will remove all coins from your watchlist and delete all associated alerts.',
  },
  alerts: {
    title: 'Delete All Alerts?',
    message: 'This will permanently delete all your alerts. You can create new ones anytime.',
  },
  history: {
    title: 'Delete All History?',
    message: 'This will permanently delete all your alert history. This action cannot be undone.',
  },
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  type,
  isLoading,
}: DeleteConfirmDialogProps) {
  const content = dialogContent[type]

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={content.title}
      message={content.message}
      confirmText="Delete"
      cancelText="Cancel"
      variant="danger"
      isLoading={isLoading}
    />
  )
}
