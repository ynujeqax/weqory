import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'

interface AlertStatusBadgeProps {
  isPaused: boolean
  isTriggered?: boolean
}

export function AlertStatusBadge({ isPaused, isTriggered }: AlertStatusBadgeProps) {
  if (isPaused) {
    return (
      <Badge variant="neutral" size="sm">
        Paused
      </Badge>
    )
  }

  if (isTriggered) {
    return (
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Badge variant="success" size="sm">
          <motion.span
            animate={{
              opacity: [1, 0.5, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            Active
          </motion.span>
        </Badge>
      </motion.div>
    )
  }

  return (
    <Badge variant="success" size="sm">
      Active
    </Badge>
  )
}
