import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { HistoryCard } from './HistoryCard'
import type { AlertHistoryItem } from '@/api/history'

interface HistoryTimelineProps {
  items: AlertHistoryItem[]
}

type DateGroup = {
  label: string
  items: AlertHistoryItem[]
}

function groupByDate(items: AlertHistoryItem[]): DateGroup[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const groups: Record<string, AlertHistoryItem[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Earlier: [],
  }

  items.forEach((item) => {
    const itemDate = new Date(item.triggered_at)
    const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate())

    if (itemDay.getTime() === today.getTime()) {
      groups.Today!.push(item)
    } else if (itemDay.getTime() === yesterday.getTime()) {
      groups.Yesterday!.push(item)
    } else if (itemDate >= weekAgo) {
      groups['This Week']!.push(item)
    } else {
      groups.Earlier!.push(item)
    }
  })

  // Return only non-empty groups
  return Object.entries(groups)
    .filter(([_, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }))
}

export function HistoryTimeline({ items }: HistoryTimelineProps) {
  const groups = useMemo(() => groupByDate(items), [items])

  return (
    <div className="space-y-6">
      {groups.map((group, groupIndex) => (
        <motion.div
          key={group.label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: groupIndex * 0.1 }}
          className="space-y-3"
        >
          {/* Date header */}
          <div className="flex items-center gap-3">
            <h3 className="text-label font-semibold text-tg-text">
              {group.label}
            </h3>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* History cards */}
          <motion.div
            className="space-y-2"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.05,
                },
              },
            }}
          >
            {group.items.map((item) => (
              <HistoryCard key={item.id} item={item} />
            ))}
          </motion.div>
        </motion.div>
      ))}
    </div>
  )
}
