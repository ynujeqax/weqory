import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, DollarSign, BarChart3, Hash, Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { CoinLogo } from '@/components/common/CoinLogo'
import { Sparkline } from '@/components/common/Sparkline'
import { cn, formatPrice, formatPercentage, formatLargeNumber, getPriceChangeColor } from '@/lib/utils'
import { useTelegram } from '@/hooks/useTelegram'
import type { WatchlistItem, PriceUpdate } from '@/types'

interface CoinDetailSheetProps {
  isOpen: boolean
  onClose: () => void
  item: WatchlistItem
  price?: PriceUpdate
  sparklineData?: number[]
  onCreateAlert: () => void
  onRemove: () => void
}

export function CoinDetailSheet({
  isOpen,
  onClose,
  item,
  price,
  sparklineData = [],
  onCreateAlert,
  onRemove,
}: CoinDetailSheetProps) {
  const { hapticFeedback } = useTelegram()
  const [isRemoving, setIsRemoving] = useState(false)

  const { coin, alertsCount } = item
  const currentPrice = price?.price ?? coin.currentPrice ?? 0
  const priceChange = price?.change24hPct ?? coin.priceChange24hPct ?? 0
  const volume = price?.volume24h ?? coin.volume24h ?? 0
  const marketCap = coin.marketCap ?? 0
  const rank = coin.rank ?? 0

  const handleCreateAlert = () => {
    hapticFeedback('light')
    onCreateAlert()
  }

  const handleRemove = async () => {
    hapticFeedback('medium')
    setIsRemoving(true)
    await onRemove()
    setIsRemoving(false)
    onClose()
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <CoinLogo symbol={coin.symbol} name={coin.name} size="lg" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-headline-lg font-semibold text-tg-text">
                {coin.name}
              </h2>
              {rank > 0 && (
                <span className="text-body-sm text-tg-hint">#{rank}</span>
              )}
            </div>
            <p className="text-body text-tg-hint">{coin.symbol}</p>
          </div>
        </div>

        {/* Price */}
        <div>
          <motion.p
            key={currentPrice}
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            className="text-[32px] leading-tight font-mono font-bold text-tg-text mb-1"
          >
            {formatPrice(currentPrice)}
          </motion.p>
          <p className={cn('text-headline font-mono font-semibold', getPriceChangeColor(priceChange))}>
            {formatPercentage(priceChange)}
          </p>
        </div>

        {/* Sparkline */}
        {sparklineData.length > 0 && (
          <div className="bg-surface-elevated rounded-lg p-4">
            <p className="text-body-sm text-tg-hint mb-3">Last 24h</p>
            <Sparkline
              data={sparklineData}
              width={280}
              height={80}
            />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<DollarSign size={18} />}
            label="Market Cap"
            value={formatLargeNumber(marketCap)}
          />
          <StatCard
            icon={<BarChart3 size={18} />}
            label="24h Volume"
            value={formatLargeNumber(volume)}
          />
          <StatCard
            icon={<Hash size={18} />}
            label="Rank"
            value={rank > 0 ? `#${rank}` : 'N/A'}
          />
          <StatCard
            icon={<Bell size={18} />}
            label="Active Alerts"
            value={alertsCount.toString()}
          />
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <Button
            onClick={handleCreateAlert}
            size="lg"
            className="w-full"
            leftIcon={<Bell size={20} />}
          >
            Create Alert
          </Button>

          <Button
            onClick={handleRemove}
            variant="ghost"
            size="lg"
            className="w-full text-danger"
            leftIcon={<Trash2 size={20} />}
            isLoading={isRemoving}
          >
            Remove from Watchlist
          </Button>
        </div>
      </div>
    </Sheet>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="bg-surface-elevated rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1 text-tg-hint">
        {icon}
        <p className="text-body-sm">{label}</p>
      </div>
      <p className="text-label font-semibold text-tg-text">{value}</p>
    </div>
  )
}
