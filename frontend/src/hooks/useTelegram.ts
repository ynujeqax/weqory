import { useState, useEffect, useCallback } from 'react'

// Invoice status type for openInvoice callback
export type InvoiceStatus = 'paid' | 'cancelled' | 'failed' | 'pending'

// Telegram WebApp types
interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    query_id?: string
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
      language_code?: string
      is_premium?: boolean
      photo_url?: string
    }
    auth_date: number
    hash: string
  }
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: {
    bg_color?: string
    text_color?: string
    hint_color?: string
    link_color?: string
    button_color?: string
    button_text_color?: string
    secondary_bg_color?: string
  }
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  MainButton: {
    text: string
    color: string
    textColor: string
    isVisible: boolean
    isActive: boolean
    isProgressVisible: boolean
    setText: (text: string) => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
    show: () => void
    hide: () => void
    enable: () => void
    disable: () => void
    showProgress: (leaveActive?: boolean) => void
    hideProgress: () => void
  }
  BackButton: {
    isVisible: boolean
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
    show: () => void
    hide: () => void
  }
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
    selectionChanged: () => void
  }
  ready: () => void
  expand: () => void
  close: () => void
  enableClosingConfirmation: () => void
  disableClosingConfirmation: () => void
  setHeaderColor: (color: string) => void
  setBackgroundColor: (color: string) => void
  showPopup: (params: {
    title?: string
    message: string
    buttons?: Array<{
      id?: string
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive'
      text?: string
    }>
  }, callback?: (buttonId: string) => void) => void
  showAlert: (message: string, callback?: () => void) => void
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void
  openTelegramLink: (url: string) => void
  openInvoice: (url: string, callback?: (status: InvoiceStatus) => void) => void
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

export function useTelegram() {
  const [isReady, setIsReady] = useState(false)
  const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null

  useEffect(() => {
    if (webApp) {
      setIsReady(true)
    }
  }, [webApp])

  const user = webApp?.initDataUnsafe?.user

  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'selection') => {
    if (!webApp?.HapticFeedback) return

    switch (type) {
      case 'light':
      case 'medium':
      case 'heavy':
        webApp.HapticFeedback.impactOccurred(type)
        break
      case 'success':
      case 'error':
      case 'warning':
        webApp.HapticFeedback.notificationOccurred(type)
        break
      case 'selection':
        webApp.HapticFeedback.selectionChanged()
        break
    }
  }, [webApp])

  const showConfirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!webApp) {
        resolve(window.confirm(message))
        return
      }
      webApp.showConfirm(message, (confirmed: boolean) => {
        resolve(confirmed)
      })
    })
  }, [webApp])

  const showAlert = useCallback((message: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!webApp) {
        window.alert(message)
        resolve()
        return
      }
      webApp.showAlert(message, () => {
        resolve()
      })
    })
  }, [webApp])

  /**
   * Open Telegram Stars payment invoice
   * @param url - Invoice link from createInvoiceLink API
   * @returns Promise with payment status
   */
  const openInvoice = useCallback((url: string): Promise<InvoiceStatus> => {
    return new Promise((resolve) => {
      if (!webApp?.openInvoice) {
        // Fallback for non-Telegram environment (development)
        console.warn('[useTelegram] openInvoice not available, simulating cancelled')
        resolve('cancelled')
        return
      }
      webApp.openInvoice(url, (status: InvoiceStatus) => {
        resolve(status)
      })
    })
  }, [webApp])

  return {
    webApp,
    isReady,
    user,
    initData: webApp?.initData ?? '',
    colorScheme: webApp?.colorScheme ?? 'dark',
    hapticFeedback,
    showConfirm,
    showAlert,
    openInvoice,
  }
}
