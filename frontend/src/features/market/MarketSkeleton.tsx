import { Skeleton } from '@/components/ui/Skeleton'

export function MarketCoinSkeleton() {
  return (
    <div className="bg-surface rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Skeleton variant="text" className="w-6 h-4" />
          <Skeleton variant="circular" className="w-8 h-8" />
          <div className="space-y-2">
            <Skeleton variant="text" className="w-16 h-4" />
            <Skeleton variant="text" className="w-24 h-3" />
          </div>
        </div>
        <Skeleton className="w-8 h-8 rounded-md" />
      </div>
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" className="w-24 h-4" />
          <Skeleton variant="text" className="w-16 h-3" />
        </div>
        <Skeleton className="w-20 h-8" />
      </div>
    </div>
  )
}

export function MarketSkeletonList({ count = 10 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <MarketCoinSkeleton key={i} />
      ))}
    </div>
  )
}

export function MarketOverviewSkeleton() {
  return (
    <div className="bg-surface rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="w-32 h-6" />
        <Skeleton variant="circular" className="w-5 h-5" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-elevated rounded-lg p-3">
            <Skeleton variant="text" className="w-20 h-3 mb-2" />
            <Skeleton variant="text" className="w-24 h-4" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function FearGreedSkeleton() {
  return (
    <div className="bg-surface rounded-lg p-4">
      <Skeleton variant="text" className="w-32 h-4 mx-auto mb-4" />
      <Skeleton className="w-48 h-24 mx-auto mb-4" />
      <div className="text-center space-y-2">
        <Skeleton variant="text" className="w-16 h-8 mx-auto" />
        <Skeleton variant="text" className="w-24 h-3 mx-auto" />
      </div>
    </div>
  )
}
