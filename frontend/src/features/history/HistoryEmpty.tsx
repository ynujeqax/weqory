import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'

export function HistoryEmpty() {
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
        <Clock className="w-10 h-10 text-tg-hint" />
      </motion.div>

      {/* Text */}
      <h3 className="text-lg font-semibold text-tg-text mb-2">No History Yet</h3>
      <p className="text-sm text-tg-hint max-w-xs">
        When your alerts trigger, they'll appear here
      </p>
    </motion.div>
  )
}
