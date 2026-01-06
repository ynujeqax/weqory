import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface DangerZoneProps {
  onDeleteWatchlist: () => void
  onDeleteAlerts: () => void
  onDeleteHistory: () => void
}

export function DangerZone({
  onDeleteWatchlist,
  onDeleteAlerts,
  onDeleteHistory,
}: DangerZoneProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-surface rounded-lg p-4 space-y-4 border border-danger/20"
    >
      <div>
        <h3 className="text-label font-semibold text-danger">Danger Zone</h3>
        <p className="text-body-sm text-tg-hint mt-1">
          These actions cannot be undone
        </p>
      </div>

      <div className="space-y-2">
        <Button
          variant="ghost"
          onClick={onDeleteWatchlist}
          className="w-full justify-start text-danger hover:bg-danger-soft"
        >
          <Trash2 size={16} />
          Delete All Watchlist
        </Button>

        <Button
          variant="ghost"
          onClick={onDeleteAlerts}
          className="w-full justify-start text-danger hover:bg-danger-soft"
        >
          <Trash2 size={16} />
          Delete All Alerts
        </Button>

        <Button
          variant="ghost"
          onClick={onDeleteHistory}
          className="w-full justify-start text-danger hover:bg-danger-soft"
        >
          <Trash2 size={16} />
          Delete All History
        </Button>
      </div>
    </motion.div>
  )
}
