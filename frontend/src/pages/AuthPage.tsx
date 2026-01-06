import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import { useTelegram } from '@/hooks/useTelegram'
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'

export default function AuthPage() {
  const navigate = useNavigate()
  const { initData } = useTelegram()
  const { setUser, setLimits, setToken, isAuthenticated } = useAuthStore()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleAuth = async () => {
    try {
      if (!initData) {
        toast.error('Telegram authentication data not found')
        return
      }

      const response = await apiClient.post('/auth/validate', {
        initData,
      })

      if (response.data.success) {
        const { user, token: authToken, limits } = response.data.data

        setUser(user)
        setToken(authToken)
        setLimits(limits)

        toast.success('Welcome to Weqory!')
        navigate('/', { replace: true })
      }
    } catch (error) {
      console.error('Auth failed:', error)
      toast.error('Authentication failed. Please try again.')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-8 text-center"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.1 }}
          className="flex justify-center"
        >
          <div className="p-6 bg-tg-link/10 rounded-2xl">
            <TrendingUp size={48} className="text-tg-link" />
          </div>
        </motion.div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-display font-bold text-tg-text">
            Weqory
          </h1>
          <p className="text-body-lg text-tg-hint max-w-sm mx-auto">
            Professional cryptocurrency screening with real-time alerts
          </p>
        </div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-3 py-4"
        >
          {[
            'Track up to 100 cryptocurrencies',
            'Set custom price alerts',
            'Real-time market data',
            'Professional trading tools',
          ].map((feature, index) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="flex items-center gap-3 text-left text-body text-tg-hint"
            >
              <div className="w-1.5 h-1.5 bg-tg-link rounded-full" />
              {feature}
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Button
            variant="primary"
            size="lg"
            onClick={handleAuth}
            className="w-full"
          >
            Get Started
          </Button>
          <p className="text-label-sm text-tg-hint mt-4">
            By continuing, you agree to our Terms of Service
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
