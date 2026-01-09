import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const features = [
  { name: 'Coins in Watchlist', standard: '3', pro: '9', ultimate: '27' },
  { name: 'Active Alerts', standard: '6', pro: '18', ultimate: '54' },
  { name: 'Notifications/Month', standard: '18', pro: '162', ultimate: '∞' },
  { name: 'History Retention', standard: '24h', pro: '7d', ultimate: '30d' },
  { name: 'Real-time Price Updates', standard: '✓', pro: '✓', ultimate: '✓' },
  { name: 'Advanced Alert Types', standard: '✗', pro: '✓', ultimate: '✓' },
  { name: 'Priority Support', standard: '✗', pro: '✗', ultimate: '✓' },
]

export function PlanComparison() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface rounded-lg overflow-hidden"
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-hover transition-colors"
      >
        <span className="text-label font-semibold text-tg-text">
          Compare All Features
        </span>
        <ChevronDown
          size={20}
          className={cn(
            'text-tg-hint transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Expandable comparison table */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="py-2 text-left font-semibold text-tg-hint">
                      Feature
                    </th>
                    <th className="py-2 text-center font-semibold text-tg-text">
                      Standard
                    </th>
                    <th className="py-2 text-center font-semibold text-warning">
                      Pro
                    </th>
                    <th className="py-2 text-center font-semibold text-cyan-400">
                      Ultimate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((feature, index) => (
                    <motion.tr
                      key={feature.name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-white/5 last:border-0"
                    >
                      <td className="py-3 text-tg-text">{feature.name}</td>
                      <td className="py-3 text-center text-tg-hint">
                        {feature.standard}
                      </td>
                      <td className="py-3 text-center text-tg-text">
                        {feature.pro}
                      </td>
                      <td className="py-3 text-center text-cyan-400 font-medium">
                        {feature.ultimate}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
