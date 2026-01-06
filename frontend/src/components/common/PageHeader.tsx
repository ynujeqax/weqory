import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTelegram } from '@/hooks/useTelegram'

interface PageHeaderProps {
  title: string
  showBack?: boolean
  leftAction?: {
    icon?: React.ReactNode
    label?: string
    onClick: () => void
  }
  action?: {
    icon?: React.ReactNode
    label?: string
    onClick: () => void
  }
  className?: string
}

export function PageHeader({ title, showBack, leftAction, action, className }: PageHeaderProps) {
  const navigate = useNavigate()
  const { hapticFeedback } = useTelegram()

  const handleBack = () => {
    hapticFeedback('light')
    navigate(-1)
  }

  const handleLeftAction = () => {
    hapticFeedback('light')
    leftAction?.onClick()
  }

  const handleAction = () => {
    hapticFeedback('light')
    action?.onClick()
  }

  const header = (
    <header className={cn('fixed top-0 left-0 right-0 z-40 glass', className)}>
      <div className="flex items-center justify-between px-lg h-14 max-w-md mx-auto">
        <div className="flex items-center gap-2">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-1 -ml-1 text-tg-button"
            >
              <ChevronLeft size={28} />
            </button>
          )}
          {leftAction && (
            <button
              onClick={handleLeftAction}
              className="p-1 -ml-1 text-tg-button"
            >
              {leftAction.icon || <ChevronLeft size={28} />}
            </button>
          )}
          <h1 className="text-headline-lg text-tg-text">{title}</h1>
        </div>
        {action && (
          <button
            onClick={handleAction}
            className="flex items-center gap-1 text-tg-button"
          >
            {action.icon || <Plus size={24} />}
            {action.label && (
              <span className="text-label">{action.label}</span>
            )}
          </button>
        )}
      </div>
    </header>
  )

  // Use portal to render outside PageTransition to avoid transform affecting fixed positioning
  return createPortal(header, document.body)
}
