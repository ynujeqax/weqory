import { motion } from 'framer-motion'
import { Bell, Vibrate, Download } from 'lucide-react'
import { Toggle } from '@/components/ui/Toggle'
import { Button } from '@/components/ui/Button'
import { usePWA } from '@/hooks/usePWA'
import type { User } from '@/types'

interface SettingsSectionProps {
  user: User
  onNotificationsChange: (enabled: boolean) => void
  onVibrationChange: (enabled: boolean) => void
}

export function SettingsSection({
  user,
  onNotificationsChange,
  onVibrationChange,
}: SettingsSectionProps) {
  const { isInstallable, install } = usePWA()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-surface rounded-lg p-4 space-y-4"
    >
      <h3 className="text-label font-semibold text-tg-text">Settings</h3>

      <div className="space-y-4">
        {/* Notifications */}
        <div className="flex items-start gap-3">
          <Bell size={20} className="text-tg-hint mt-0.5" />
          <Toggle
            checked={user.notificationsEnabled}
            onChange={onNotificationsChange}
            label="Notifications"
            description="Receive alerts via Telegram"
          />
        </div>

        {/* Vibration */}
        <div className="flex items-start gap-3">
          <Vibrate size={20} className="text-tg-hint mt-0.5" />
          <Toggle
            checked={user.vibrationEnabled}
            onChange={onVibrationChange}
            label="Haptic Feedback"
            description="Vibration on interactions"
          />
        </div>

        {/* PWA Install */}
        {isInstallable && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="pt-2 border-t border-white/5"
          >
            <Button
              variant="secondary"
              onClick={install}
              className="w-full justify-start"
            >
              <Download size={18} />
              Add to Home Screen
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
