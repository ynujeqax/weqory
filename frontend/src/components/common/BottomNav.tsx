import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutList, Bell, History, TrendingUp, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTelegram } from '@/hooks/useTelegram'

const navItems = [
  { path: '/', label: 'Watchlist', icon: LayoutList },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/history', label: 'History', icon: History },
  { path: '/market', label: 'Market', icon: TrendingUp },
  { path: '/profile', label: 'Profile', icon: User },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { hapticFeedback } = useTelegram()

  const handleNavigation = (path: string) => {
    hapticFeedback('selection')
    navigate(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass safe-area-inset-bottom z-50">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path))

          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full',
                'transition-colors duration-200'
              )}
            >
              <div className="relative">
                <item.icon
                  size={24}
                  className={cn(
                    'transition-colors',
                    isActive ? 'text-tg-button' : 'text-tg-hint'
                  )}
                />
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-tg-button rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium',
                  isActive ? 'text-tg-button' : 'text-tg-hint'
                )}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
