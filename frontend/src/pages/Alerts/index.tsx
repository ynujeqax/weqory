import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { hapticFeedback } from '@telegram-apps/sdk'
import { useAlerts, useUpdateAlert, useDeleteAlert } from '@/api/hooks'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { AlertCard } from '@/features/alerts/AlertCard'
import { AlertSkeleton } from '@/features/alerts/AlertSkeleton'
import { AlertEmpty } from '@/features/alerts/AlertEmpty'
import { DeleteAlertDialog } from '@/features/alerts/DeleteAlertDialog'
import { useToast } from '@/hooks/useToast'
type AlertTab = 'active' | 'paused' | 'all'

export default function AlertsPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<AlertTab>('active')
  const [deletingAlertId, setDeletingAlertId] = useState<string | null>(null)

  const { data, isLoading } = useAlerts()
  const updateAlert = useUpdateAlert()
  const deleteAlert = useDeleteAlert()

  const filteredAlerts = useMemo(() => {
    if (!data?.items) return []

    switch (activeTab) {
      case 'active':
        return data.items.filter((alert) => !alert.isPaused)
      case 'paused':
        return data.items.filter((alert) => alert.isPaused)
      case 'all':
        return data.items
      default:
        return data.items
    }
  }, [data, activeTab])

  const handleCreate = () => {
    hapticFeedback.impactOccurred('medium')
    navigate('/alerts/create')
  }

  const handlePause = async (id: string) => {
    try {
      const alert = data?.items.find((a) => a.id === id)
      if (!alert) return

      await updateAlert.mutateAsync({
        id,
        is_paused: !alert.isPaused,
      })

      showToast({
        type: 'success',
        message: alert.isPaused ? 'Alert resumed' : 'Alert paused',
      })
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to update alert',
      })
    }
  }

  const handleDeleteRequest = (id: string) => {
    setDeletingAlertId(id)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingAlertId) return

    try {
      await deleteAlert.mutateAsync(deletingAlertId)
      setDeletingAlertId(null)
      showToast({
        type: 'success',
        message: 'Alert deleted',
      })
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to delete alert',
      })
    }
  }

  const handleDeleteCancel = () => {
    setDeletingAlertId(null)
  }

  const hasAlerts = !isLoading && data?.items && data.items.length > 0
  const isEmpty = !isLoading && (!data?.items || data.items.length === 0)

  const tabs = [
    { id: 'active' as const, label: 'Active', count: data?.items.filter((a) => !a.isPaused).length },
    { id: 'paused' as const, label: 'Paused', count: data?.items.filter((a) => a.isPaused).length },
    { id: 'all' as const, label: 'All', count: data?.items.length },
  ]

  return (
    <div className="pb-20">
      <PageHeader
        title="Alerts"
        action={
          hasAlerts
            ? {
                label: 'Add',
                onClick: handleCreate,
              }
            : undefined
        }
      />

      <div className="px-4 py-3">
        {/* Filter Tabs - only show when alerts exist */}
        {hasAlerts && (
          <div className="mb-4">
            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={(tab) => setActiveTab(tab as AlertTab)}
            />
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <AlertSkeleton key={i} />
            ))}
          </div>
        ) : isEmpty ? (
          <AlertEmpty
            title="No alerts yet"
            description="Create your first alert to get started"
            showCreateButton={true}
          />
        ) : filteredAlerts.length === 0 ? (
          <AlertEmpty
            title={
              activeTab === 'paused'
                ? 'No paused alerts'
                : 'No active alerts'
            }
            description={
              activeTab === 'paused'
                ? 'You have no paused alerts'
                : 'All your alerts are paused'
            }
            showCreateButton={false}
          />
        ) : (
          <motion.div layout className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onPause={handlePause}
                  onDelete={handleDeleteRequest}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* FAB - only show when alerts exist */}
      {hasAlerts && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="fixed bottom-24 right-4 z-10"
        >
          <Button
            onClick={handleCreate}
            size="lg"
            className="rounded-full w-14 h-14 shadow-xl shadow-black/20"
          >
            <Plus size={24} />
          </Button>
        </motion.div>
      )}

      {/* Delete Dialog */}
      <DeleteAlertDialog
        isOpen={deletingAlertId !== null}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteAlert.isPending}
      />
    </div>
  )
}
