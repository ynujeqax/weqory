import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { AlertTriangle } from 'lucide-react'

interface DeleteAlertDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
}

export function DeleteAlertDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: DeleteAlertDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="text-center py-4">
        {/* Warning Icon */}
        <div className="w-16 h-16 rounded-full bg-danger-soft flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-danger" />
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-tg-text mb-2">Delete Alert?</h3>
        <p className="text-sm text-tg-hint mb-6">
          This will permanently delete this alert and its history. This action cannot be undone.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1" isLoading={isLoading}>
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  )
}
