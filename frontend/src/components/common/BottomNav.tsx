import { useLocation, useNavigate } from 'react-router-dom'
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
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path))

          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                'flex items-center justify-center flex-1 h-full',
                'transition-colors duration-200'
              )}
            >
              <item.icon
                size={24}
                className={cn(
                  'transition-colors',
                  isActive ? 'text-tg-button' : 'text-tg-hint'
                )}
              />
            </button>
          )
        })}
      </div>
    </nav>
  )
}
