import { motion } from 'framer-motion'
import { Bell, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useNavigate } from 'react-router-dom'
import { hapticFeedback } from '@telegram-apps/sdk'

interface AlertEmptyProps {
  title?: string
  description?: string
  showCreateButton?: boolean
}

export function AlertEmpty({
  title = 'No alerts yet',
  description = 'Create your first alert to get notified when prices hit your targets',
  showCreateButton = true,
}: AlertEmptyProps) {
  const navigate = useNavigate()

  const handleCreate = () => {
    hapticFeedback.impactOccurred('medium')
    navigate('/alerts/create')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      {/* Icon */}
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="w-20 h-20 rounded-full bg-surface-elevated flex items-center justify-center mb-6"
      >
        <Bell className="w-10 h-10 text-tg-hint" />
      </motion.div>

      {/* Text */}
      <h3 className="text-lg font-semibold text-tg-text mb-2">{title}</h3>
      <p className="text-sm text-tg-hint mb-8 max-w-xs">{description}</p>

      {/* CTA */}
      {showCreateButton && (
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Alert
        </Button>
      )}
    </motion.div>
  )
}
