import { ConfirmDialog } from '@/components/common/ConfirmDialog'

interface ClearHistoryDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
}

export function ClearHistoryDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: ClearHistoryDialogProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Clear All History?"
      message="This will permanently delete all your alert history. This action cannot be undone."
      confirmText="Clear History"
      cancelText="Cancel"
      variant="danger"
      isLoading={isLoading}
    />
  )
}
