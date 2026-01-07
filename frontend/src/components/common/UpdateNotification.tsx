import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSWUpdate } from '@/hooks/usePWA'

export function UpdateNotification() {
  const { hasUpdate, updateReady, updateApp } = useSWUpdate()
  const [dismissed, setDismissed] = useState(false)

  // Reset dismissed state when update becomes ready
  useEffect(() => {
    if (updateReady) {
      setDismissed(false)
    }
  }, [updateReady])

  const showNotification = (hasUpdate || updateReady) && !dismissed

  return (
    <AnimatePresence>
      {showNotification && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 right-4 z-50"
        >
          <div className="bg-surface-elevated rounded-xl p-4 shadow-lg border border-white/10">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-tg-button/20 shrink-0">
                <RefreshCw className="w-5 h-5 text-tg-button" />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-tg-text text-sm">
                  {updateReady ? 'Update Ready' : 'New Version Available'}
                </h4>
                <p className="text-xs text-tg-hint mt-0.5">
                  {updateReady
                    ? 'Click to refresh and apply the update'
                    : 'A new version of Weqory is available'}
                </p>
              </div>

              <button
                onClick={() => setDismissed(true)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
              >
                <X className="w-4 h-4 text-tg-hint" />
              </button>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={updateApp}
                className="flex-1 py-2 px-4 bg-tg-button text-tg-button-text rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {updateReady ? 'Refresh Now' : 'Update'}
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="py-2 px-4 bg-white/10 text-tg-text rounded-lg text-sm font-medium hover:bg-white/15 transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
