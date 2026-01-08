import { motion } from 'framer-motion'
import { Bell, Vibrate, Download, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Toggle } from '@/components/ui/Toggle'
import { Button } from '@/components/ui/Button'
import { LanguageSwitcher } from '@/components/common'
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
  const { t } = useTranslation()
  const { isInstallable, install } = usePWA()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-surface rounded-lg p-4 space-y-4"
    >
      <h3 className="text-label font-semibold text-tg-text">{t('profile.settings.title')}</h3>

      <div className="space-y-4">
        {/* Notifications */}
        <div className="flex items-start gap-3">
          <Bell size={20} className="text-tg-hint mt-0.5" />
          <Toggle
            checked={user.notificationsEnabled}
            onChange={onNotificationsChange}
            label={t('profile.settings.notifications')}
            description={t('profile.settings.notificationsHint')}
          />
        </div>

        {/* Vibration */}
        <div className="flex items-start gap-3">
          <Vibrate size={20} className="text-tg-hint mt-0.5" />
          <Toggle
            checked={user.vibrationEnabled}
            onChange={onVibrationChange}
            label={t('profile.settings.vibration')}
            description={t('profile.settings.vibrationHint')}
          />
        </div>

        {/* Language */}
        <div className="flex items-start gap-3">
          <Globe size={20} className="text-tg-hint mt-0.5" />
          <LanguageSwitcher />
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
