import { useMemo } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import {
  MarketCapCard,
  AltcoinSeasonCard,
  FearGreedGauge,
  GainersLosersTable,
} from '@/features/market'
import { useMarketOverview, useAvailableCoins } from '@/api/hooks'

export default function MarketPage() {
  // Data fetching
  const { data: marketOverview, isLoading: isLoadingOverview } = useMarketOverview()
  const { data: allCoins, isLoading: isLoadingCoins } = useAvailableCoins(undefined, 1000)

  // Filter out coins without price change data for gainers/losers
  const validCoins = useMemo(() => {
    if (!allCoins) return []
    return allCoins.coins.filter(coin => coin.priceChange24hPct !== undefined && coin.priceChange24hPct !== null)
  }, [allCoins])

  const isLoading = isLoadingOverview || isLoadingCoins

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen pb-20 bg-bg-primary">
        <PageHeader title="Market" />
        <div className="px-4 pt-4 space-y-4">
          {/* Two cards skeleton */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface rounded-xl h-28 animate-pulse" />
            <div className="bg-surface rounded-xl h-28 animate-pulse" />
          </div>
          {/* Fear & Greed skeleton */}
          <div className="bg-surface rounded-xl h-32 animate-pulse" />
          {/* Table skeleton */}
          <div className="bg-surface rounded-xl h-96 animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 bg-bg-primary">
      <PageHeader title="Market" />

      <div className="px-4 pt-4 space-y-4">
        {/* Two Cards: Market Cap and Altcoin Season */}
        <div className="grid grid-cols-2 gap-3">
          {marketOverview && (
            <>
              <MarketCapCard
                marketCap={marketOverview.total_market_cap}
                marketCapChange24hPct={marketOverview.market_cap_change_24h_pct}
              />
              <AltcoinSeasonCard btcDominance={marketOverview.btc_dominance} />
            </>
          )}
        </div>

        {/* Fear & Greed Index - Full Width */}
        {marketOverview && (
          <FearGreedGauge
            value={marketOverview.fear_greed_index.value}
            classification={marketOverview.fear_greed_index.classification}
          />
        )}

        {/* Gainers and Losers Table */}
        {validCoins.length > 0 && <GainersLosersTable coins={validCoins} />}

        {validCoins.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-body text-tg-hint">No market data available</p>
          </div>
        )}
      </div>
    </div>
  )
}
