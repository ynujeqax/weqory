import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Check, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { CoinLogo } from '@/components/common/CoinLogo'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CoinSkeleton } from '@/components/ui/Skeleton'
import { useAvailableCoins, useWatchlist, useAddToWatchlist, useUser } from '@/api/hooks'
import { cn, formatPrice, formatLargeNumber } from '@/lib/utils'
import { useTelegram } from '@/hooks/useTelegram'
import type { Coin } from '@/types'

export default function AddCoinPage() {
  const navigate = useNavigate()
  const { hapticFeedback } = useTelegram()

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Fetch data
  const { data: user } = useUser()
  const { data: watchlist } = useWatchlist()
  const { data: availableCoins, isLoading } = useAvailableCoins(debouncedSearch || undefined, 100)
  const addToWatchlist = useAddToWatchlist()

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Check if coin is in watchlist
  const isInWatchlist = useCallback(
    (symbol: string) => {
      return watchlist?.items.some((item) => item.coin.symbol === symbol) ?? false
    },
    [watchlist]
  )

  // Check limits
  const limits = user?.limits
  const canAddMore = limits ? limits.coinsUsed < limits.maxCoins : true

  // Popular coins (top 20 if no search)
  const popularCoins = useMemo(() => {
    if (debouncedSearch) return []
    return availableCoins?.coins.slice(0, 20) ?? []
  }, [availableCoins, debouncedSearch])

  // Search results
  const searchResults = useMemo(() => {
    if (!debouncedSearch) return []
    return availableCoins?.coins ?? []
  }, [availableCoins, debouncedSearch])

  const handleBack = () => {
    navigate(-1)
  }

  const handleToggleCoin = async (coin: Coin) => {
    const inWatchlist = isInWatchlist(coin.symbol)

    if (!inWatchlist && !canAddMore) {
      hapticFeedback('error')
      return
    }

    try {
      hapticFeedback('light')
      await addToWatchlist.mutateAsync(coin.symbol)
    } catch (error) {
      console.error('Failed to toggle coin:', error)
      hapticFeedback('error')
    }
  }

  return (
    <div className="pb-20">
      <PageHeader
        title="Add Coin"
        leftAction={{
          icon: <ArrowLeft size={20} />,
          onClick: handleBack,
        }}
      />

      {/* Search */}
      <div className="px-4 py-3">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search cryptocurrencies..."
        />
      </div>


      {/* Content */}
      <div className="px-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <CoinSkeleton key={i} />
            ))}
          </div>
        ) : (searchResults.length > 0 || popularCoins.length > 0) ? (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {(debouncedSearch ? searchResults : popularCoins).map((coin) => (
                <CoinRow
                  key={coin.id}
                  coin={coin}
                  isAdded={isInWatchlist(coin.symbol)}
                  onToggle={() => handleToggleCoin(coin)}
                  disabled={!canAddMore && !isInWatchlist(coin.symbol)}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : debouncedSearch ? (
          <div className="py-16 text-center">
            <p className="text-body text-tg-hint">No results found for "{debouncedSearch}"</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

interface CoinRowProps {
  coin: Coin
  isAdded: boolean
  onToggle: () => void
  disabled?: boolean
}

function CoinRow({ coin, isAdded, onToggle, disabled }: CoinRowProps) {
  const { hapticFeedback } = useTelegram()

  const handleClick = () => {
    if (disabled) {
      hapticFeedback('error')
      return
    }
    onToggle()
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'bg-surface rounded-lg p-4 flex items-center justify-between',
        disabled && 'opacity-50'
      )}
    >
      {/* Left: Coin Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <CoinLogo symbol={coin.symbol} name={coin.name} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-label font-semibold text-tg-text truncate">
              {coin.symbol}
            </p>
            {coin.rank && coin.rank <= 10 && (
              <Badge variant="primary" size="sm">
                #{coin.rank}
              </Badge>
            )}
          </div>
          <p className="text-body-sm text-tg-hint truncate">{coin.name}</p>
          <div className="flex items-center gap-3 mt-1">
            {coin.currentPrice && (
              <p className="text-body-sm font-mono text-tg-text">
                {formatPrice(coin.currentPrice)}
              </p>
            )}
            {coin.marketCap && (
              <p className="text-body-sm text-tg-hint">
                {formatLargeNumber(coin.marketCap)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right: Toggle Button */}
      <Button
        variant={isAdded ? 'secondary' : 'primary'}
        size="sm"
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          'flex-shrink-0 ml-3',
          isAdded && 'bg-success/20 text-success hover:bg-success/30'
        )}
      >
        {isAdded ? (
          <>
            <Check size={16} />
            <span className="ml-1">Added</span>
          </>
        ) : (
          <>
            <Plus size={16} />
            <span className="ml-1">Add</span>
          </>
        )}
      </Button>
    </motion.div>
  )
}
