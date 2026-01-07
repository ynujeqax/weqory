import { useEffect, useState, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface UsePWAReturn {
  isInstallable: boolean
  isInstalled: boolean
  install: () => Promise<void>
}

export function usePWA(): UsePWAReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true)
      }
    }

    checkInstalled()

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) {
      return
    }

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }, [deferredPrompt])

  return {
    isInstallable: !!deferredPrompt && !isInstalled,
    isInstalled,
    install,
  }
}

// Service worker update hook
interface UseSWUpdateReturn {
  hasUpdate: boolean
  updateReady: boolean
  updateApp: () => void
}

export function useSWUpdate(): UseSWUpdateReturn {
  const [hasUpdate, setHasUpdate] = useState(false)
  const [updateReady, setUpdateReady] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleUpdate = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) {
        setWaitingWorker(registration.waiting)
        setHasUpdate(true)
      }
    }

    const handleStateChange = (worker: ServiceWorker) => {
      if (worker.state === 'installed') {
        setHasUpdate(true)
        setWaitingWorker(worker)
      }
    }

    navigator.serviceWorker.ready.then((registration) => {
      // Check for existing waiting worker
      if (registration.waiting) {
        handleUpdate(registration)
      }

      // Listen for new updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => handleStateChange(newWorker))
        }
      })
    })

    // Listen for controller change (update activated)
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        setUpdateReady(true)
      }
    })
  }, [])

  const updateApp = useCallback(() => {
    if (waitingWorker) {
      // Tell SW to skip waiting and activate
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    }

    if (updateReady) {
      window.location.reload()
    }
  }, [waitingWorker, updateReady])

  return {
    hasUpdate,
    updateReady,
    updateApp,
  }
}

// Register service worker with update support
export function registerServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) {
    return Promise.resolve(undefined)
  }

  return new Promise((resolve) => {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        console.log('[PWA] Service Worker registered:', registration.scope)

        // Check for updates periodically (every 30 minutes)
        setInterval(() => {
          registration.update().catch(console.error)
        }, 30 * 60 * 1000)

        resolve(registration)
      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error)
        resolve(undefined)
      }
    })
  })
}
