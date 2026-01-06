import { useCallback } from 'react'
import { hapticFeedback, popup } from '@telegram-apps/sdk'

interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  title?: string
}

export function useToast() {
  const showToast = useCallback(({ type, message, title }: ToastOptions) => {
    // Trigger haptic feedback
    switch (type) {
      case 'success':
        hapticFeedback.notificationOccurred('success')
        break
      case 'error':
        hapticFeedback.notificationOccurred('error')
        break
      case 'warning':
        hapticFeedback.notificationOccurred('warning')
        break
    }

    // Show popup in Telegram
    try {
      popup.open({
        title: title || (type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Notice'),
        message,
      })
    } catch (error) {
      // Fallback to console if popup is not supported
      console.log(`[${type.toUpperCase()}] ${title || ''}: ${message}`)
    }
  }, [])

  return { showToast }
}
