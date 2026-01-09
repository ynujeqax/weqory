import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, ExternalLink } from 'lucide-react'
import { useUser, useUpdateSettings, useDeleteWatchlist, useDeleteAlerts, useDeleteHistory } from '@/api/hooks'
import { useTelegram } from '@/hooks/useTelegram'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Divider } from '@/components/ui/Divider'
import { UserHeader } from '@/features/profile/UserHeader'
import { UsageStats } from '@/features/profile/UsageStats'
import { SettingsSection } from '@/features/profile/SettingsSection'
import { DangerZone } from '@/features/profile/DangerZone'
import { DeleteConfirmDialog } from '@/features/profile/DeleteConfirmDialog'

type DeleteType = 'watchlist' | 'alerts' | 'history' | null

export default function Profile() {
  const navigate = useNavigate()
  const { hapticFeedback } = useTelegram()
  const { showToast } = useToast()
  const [deleteDialogType, setDeleteDialogType] = useState<DeleteType>(null)

  const { data: userData, isLoading, error } = useUser()
  const updateSettings = useUpdateSettings()
  const deleteWatchlist = useDeleteWatchlist()
  const deleteAlerts = useDeleteAlerts()
  const deleteHistory = useDeleteHistory()

  const handleNotificationsChange = useCallback(
    async (enabled: boolean) => {
      hapticFeedback('light')

      try {
        await updateSettings.mutateAsync({ notifications_enabled: enabled })
        showToast({
          type: 'success',
          message: `Notifications ${enabled ? 'enabled' : 'disabled'}`,
        })
      } catch (error) {
        showToast({
          type: 'error',
          message: 'Failed to update settings',
        })
      }
    },
    [updateSettings, hapticFeedback, showToast]
  )

  const handleVibrationChange = useCallback(
    async (enabled: boolean) => {
      hapticFeedback('light')

      try {
        await updateSettings.mutateAsync({ vibration_enabled: enabled })
        showToast({
          type: 'success',
          message: `Haptic feedback ${enabled ? 'enabled' : 'disabled'}`,
        })
      } catch (error) {
        showToast({
          type: 'error',
          message: 'Failed to update settings',
        })
      }
    },
    [updateSettings, hapticFeedback, showToast]
  )

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialogType) return

    hapticFeedback('medium')

    try {
      switch (deleteDialogType) {
        case 'watchlist':
          await deleteWatchlist.mutateAsync()
          showToast({ type: 'success', message: 'Watchlist deleted' })
          break
        case 'alerts':
          await deleteAlerts.mutateAsync()
          showToast({ type: 'success', message: 'Alerts deleted' })
          break
        case 'history':
          await deleteHistory.mutateAsync()
          showToast({ type: 'success', message: 'History deleted' })
          break
      }
      setDeleteDialogType(null)
    } catch (error) {
      showToast({ type: 'error', message: 'Operation failed' })
    }
  }, [deleteDialogType, deleteWatchlist, deleteAlerts, deleteHistory, hapticFeedback, showToast])

  const handleUpgrade = useCallback(() => {
    hapticFeedback('medium')
    navigate('/profile/subscription')
  }, [navigate, hapticFeedback])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-tg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !userData) {
    return (
      <div className="min-h-screen bg-tg-bg flex flex-col items-center justify-center px-4 text-center">
        <p className="text-headline font-semibold text-tg-text mb-2">Failed to load profile</p>
        <p className="text-body text-tg-hint mb-4">
          {error instanceof Error ? error.message : 'Please try again later'}
        </p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  const { user, limits } = userData

  return (
    <div className="min-h-screen bg-tg-bg pb-20">
      <div className="px-4 py-6 space-y-6">
        {/* User Header with glass effect */}
        <UserHeader user={user} />

        {/* Usage Stats */}
        <UsageStats user={user} limits={limits} />

        {/* Upgrade CTA */}
        {user.plan !== 'ultimate' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
          >
            <Button variant="primary" onClick={handleUpgrade} className="w-full">
              <ArrowUpRight size={18} />
              Upgrade to {user.plan === 'standard' ? 'Pro' : 'Ultimate'}
            </Button>
          </motion.div>
        )}

        <Divider />

        {/* Settings */}
        <SettingsSection
          user={user}
          onNotificationsChange={handleNotificationsChange}
          onVibrationChange={handleVibrationChange}
        />

        <Divider />

        {/* Danger Zone */}
        <DangerZone
          onDeleteWatchlist={() => setDeleteDialogType('watchlist')}
          onDeleteAlerts={() => setDeleteDialogType('alerts')}
          onDeleteHistory={() => setDeleteDialogType('history')}
        />

        {/* Footer Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-2 pt-4"
        >
          <button className="flex items-center gap-2 text-body-sm text-tg-hint hover:text-tg-text transition-colors">
            <ExternalLink size={14} />
            Privacy Policy
          </button>
          <button className="flex items-center gap-2 text-body-sm text-tg-hint hover:text-tg-text transition-colors">
            <ExternalLink size={14} />
            Terms of Service
          </button>
          <p className="text-body-sm text-tg-hint pt-2">Version 1.0.0</p>
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteDialogType && (
        <DeleteConfirmDialog
          isOpen={true}
          onClose={() => setDeleteDialogType(null)}
          onConfirm={handleDeleteConfirm}
          type={deleteDialogType}
          isLoading={
            deleteWatchlist.isPending || deleteAlerts.isPending || deleteHistory.isPending
          }
        />
      )}
    </div>
  )
}
