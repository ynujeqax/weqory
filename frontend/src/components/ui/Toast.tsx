import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastStore {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: Date.now().toString() }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))

// Helper function to show toasts
export const toast = {
  success: (message: string, duration = 3000) =>
    useToastStore.getState().addToast({ type: 'success', message, duration }),
  error: (message: string, duration = 4000) =>
    useToastStore.getState().addToast({ type: 'error', message, duration }),
  warning: (message: string, duration = 3500) =>
    useToastStore.getState().addToast({ type: 'warning', message, duration }),
  info: (message: string, duration = 3000) =>
    useToastStore.getState().addToast({ type: 'info', message, duration }),
}

const icons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: AlertCircle,
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const Icon = icons[toast.type]

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id)
    }, toast.duration ?? 3000)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'flex items-center gap-3 min-w-[280px] max-w-md px-4 py-3 rounded-lg shadow-lg',
        'bg-surface-elevated border',
        {
          'border-success/20': toast.type === 'success',
          'border-danger/20': toast.type === 'error',
          'border-warning/20': toast.type === 'warning',
          'border-tg-link/20': toast.type === 'info',
        }
      )}
    >
      <Icon
        size={20}
        className={cn({
          'text-success': toast.type === 'success',
          'text-danger': toast.type === 'error',
          'text-warning': toast.type === 'warning',
          'text-tg-link': toast.type === 'info',
        })}
      />
      <p className="flex-1 text-body text-tg-text">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="p-1 rounded hover:bg-surface-hover transition-colors touch-feedback"
      >
        <X size={16} className="text-tg-hint" />
      </button>
    </motion.div>
  )
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return createPortal(
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center gap-2 p-4 pointer-events-none safe-area-inset-top">
      <AnimatePresence>
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  )
}
