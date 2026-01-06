import { motion } from 'framer-motion'
import { Eye, Plus, Bell, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface WatchlistEmptyProps {
  onAddCoin: () => void
}

export function WatchlistEmpty({ onAddCoin }: WatchlistEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16">
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="relative mb-6"
      >
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="w-20 h-20 rounded-full bg-surface-elevated flex items-center justify-center"
        >
          <Eye size={36} className="text-tg-hint" />
        </motion.div>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
          className="absolute -right-1 -bottom-1 w-8 h-8 rounded-full bg-tg-button flex items-center justify-center"
        >
          <Plus size={18} className="text-tg-button-text" />
        </motion.div>
      </motion.div>

      {/* Text */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-headline-lg font-semibold text-tg-text mb-2 text-center"
      >
        Start Your Watchlist
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-body text-tg-hint text-center max-w-[280px] mb-8"
      >
        Track your favorite cryptocurrencies and get real-time price updates
      </motion.p>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-[320px] space-y-3 mb-8"
      >
        {[
          { icon: TrendingUp, label: 'Real-time prices' },
          { icon: Bell, label: 'Custom alerts' },
          { icon: Eye, label: 'Track up to 10 coins' },
        ].map((feature, index) => (
          <motion.div
            key={feature.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            className="flex items-center gap-3 text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-surface-elevated flex items-center justify-center flex-shrink-0">
              <feature.icon size={18} className="text-tg-text" />
            </div>
            <p className="text-body text-tg-text">{feature.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Button onClick={onAddCoin} size="lg" leftIcon={<Plus size={20} />}>
          Add Your First Coin
        </Button>
      </motion.div>
    </div>
  )
}
