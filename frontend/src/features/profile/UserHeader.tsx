import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User as UserIcon } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useTelegram } from '@/hooks/useTelegram'
import { cn, formatDate } from '@/lib/utils'
import { extractColors } from '@/lib/extractColors'
import type { User, Plan } from '@/types'

interface UserHeaderProps {
  user: User
}

const planColors: Record<Plan, { bg: string; text: string; label: string }> = {
  standard: { bg: 'bg-surface-elevated', text: 'text-tg-hint', label: 'Standard' },
  pro: { bg: 'bg-warning-soft', text: 'text-warning', label: 'Pro' },
  ultimate: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'Ultimate' },
}

export function UserHeader({ user }: UserHeaderProps) {
  const { user: telegramUser } = useTelegram()
  const [imageError, setImageError] = useState(false)
  const [gradientColors, setGradientColors] = useState<string[] | null>(null)

  const { firstName, lastName, username, plan, createdAt } = user
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const initials = firstName
    ? firstName.charAt(0).toUpperCase() + (lastName ? lastName.charAt(0).toUpperCase() : '')
    : '?'

  const photoUrl = telegramUser?.photo_url
  const showImage = photoUrl && !imageError

  const planInfo = planColors[plan]

  // Extract colors from avatar
  useEffect(() => {
    if (photoUrl) {
      extractColors(photoUrl, 2).then(setGradientColors)
    }
  }, [photoUrl])

  const gradientStyle = gradientColors
    ? {
        background: `linear-gradient(135deg, ${gradientColors[0]}40 0%, ${gradientColors[1]}30 100%)`,
      }
    : undefined

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl bg-surface-elevated p-6"
      style={gradientStyle}
    >
      {/* Glass overlay */}
      <div
        className={cn(
          'absolute inset-0',
          'bg-gradient-to-br from-white/5 via-transparent to-black/20',
          'backdrop-blur-[2px]'
        )}
      />

      {/* Decorative blur orbs using extracted colors */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: gradientColors?.[0] || 'var(--tg-theme-link-color)' }}
      />
      <div
        className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-3xl opacity-20"
        style={{ backgroundColor: gradientColors?.[1] || 'var(--tg-theme-link-color)' }}
      />

      {/* Content */}
      <div className="relative space-y-4">
        {/* Avatar + Name */}
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-surface-hover flex items-center justify-center border border-white/10 overflow-hidden">
            {showImage ? (
              <img
                src={photoUrl}
                alt={fullName}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <span className="text-headline-lg font-bold text-tg-text">
                {initials}
              </span>
            )}
          </div>

          {/* Name + Username */}
          <div className="flex-1 min-w-0">
            <h2 className="text-headline font-semibold text-tg-text truncate">
              {fullName}
            </h2>
            {username && (
              <p className="text-body text-tg-hint truncate">@{username}</p>
            )}
          </div>

          {/* Plan badge */}
          <Badge
            variant={plan === 'ultimate' ? 'success' : plan === 'pro' ? 'warning' : 'neutral'}
            className={cn('font-semibold', planInfo.bg, planInfo.text)}
          >
            {planInfo.label}
          </Badge>
        </div>

        {/* Member since */}
        <div className="flex items-center gap-2 text-body-sm text-tg-hint">
          <UserIcon size={14} />
          <span>Member since {formatDate(createdAt)}</span>
        </div>
      </div>
    </motion.div>
  )
}
