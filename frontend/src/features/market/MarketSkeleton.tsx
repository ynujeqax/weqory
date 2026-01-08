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

export function MarketOverviewSkeleton() {
  return (
    <div className="bg-surface rounded-lg px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <Skeleton variant="text" className="w-8 h-3 mb-1" />
          <Skeleton variant="text" className="w-20 h-4" />
        </div>
        <div className="flex-shrink-0">
          <Skeleton variant="text" className="w-8 h-3 mb-1" />
          <Skeleton variant="text" className="w-16 h-4" />
        </div>
        <div className="w-px h-8 bg-border-subtle" />
        <div className="flex-1">
          <Skeleton variant="text" className="w-8 h-3 mb-1" />
          <Skeleton variant="text" className="w-20 h-4" />
        </div>
        <div className="flex-shrink-0">
          <Skeleton variant="text" className="w-8 h-3 mb-1" />
          <Skeleton variant="text" className="w-12 h-4" />
        </div>
      </div>
    </div>
  )
}

export function FearGreedSkeleton() {
  return (
    <div className="bg-surface rounded-lg px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <Skeleton variant="text" className="w-20 h-3 mb-1" />
          <Skeleton variant="text" className="w-24 h-4" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="w-24 h-1.5 rounded-full" />
          <Skeleton variant="text" className="w-10 h-5" />
        </div>
      </div>
    </div>
  )
}
