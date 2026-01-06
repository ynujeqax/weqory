import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export function HistoryEmpty() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <EmptyState
          icon={<Clock size={48} />}
          title="No History Yet"
          description="When your alerts trigger, they'll appear here"
        />
      </motion.div>
    </div>
  )
}
