import { Skeleton } from '@/components/ui/Skeleton'

export function MarketCoinSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 px-4 bg-surface border-b border-border-subtle">
      <Skeleton variant="text" className="w-8 h-4" />
      <Skeleton variant="circular" className="w-6 h-6" />
      <Skeleton variant="text" className="w-16 h-4 flex-1" />
      <Skeleton className="w-16 h-6" />
      <Skeleton className="w-12 h-4" />
      <Skeleton className="w-7 h-7 rounded-md" />
    </div>
  )
}

export function MarketSkeletonList({ count = 10 }: { count?: number }) {
  return (
    <div className="bg-surface rounded-lg overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <MarketCoinSkeleton key={i} />
      ))}
    </div>
  )
}

export function TopCoinCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-[160px] bg-surface rounded-xl p-3 border border-border-subtle">
      <div className="flex items-center gap-2 mb-2">
        <Skeleton variant="circular" className="w-8 h-8" />
        <Skeleton variant="text" className="w-16 h-4" />
      </div>
      <Skeleton variant="text" className="w-20 h-5 mb-1" />
      <Skeleton variant="text" className="w-16 h-4 mb-2" />
      <Skeleton className="w-full h-8 rounded" />
    </div>
  )
}

export function TopCoinsCarouselSkeleton() {
  return (
    <div className="relative -mx-4 px-4">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <TopCoinCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export function FearGreedSkeleton() {
  return (
    <div className="bg-surface rounded-xl px-4 py-4 border border-border-subtle">
      <div className="flex flex-col items-center">
        <Skeleton variant="text" className="w-32 h-3 mb-3" />
        <Skeleton variant="circular" className="w-36 h-20 mb-2" />
        <Skeleton variant="text" className="w-20 h-4" />
      </div>
    </div>
  )
}

export function MarketStatsSkeleton() {
  return (
    <div className="bg-surface rounded-xl px-4 py-4 border border-border-subtle">
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <Skeleton variant="text" className="w-16 h-3" />
            <Skeleton variant="text" className="w-12 h-4" />
          </div>
          <Skeleton variant="text" className="w-24 h-7" />
        </div>
        <div className="h-px bg-border-subtle" />
        <div>
          <Skeleton variant="text" className="w-16 h-3 mb-1" />
          <Skeleton variant="text" className="w-20 h-5" />
        </div>
      </div>
    </div>
  )
}

export function DominanceBarSkeleton() {
  return (
    <div className="bg-surface rounded-xl px-4 py-4 border border-border-subtle">
      <Skeleton variant="text" className="w-28 h-3 mb-3" />
      <Skeleton className="w-full h-2 rounded-full mb-3" />
      <div className="flex items-center justify-between gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-1">
            <Skeleton variant="text" className="w-full h-8 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
