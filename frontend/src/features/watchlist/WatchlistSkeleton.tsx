import { Skeleton } from '@/components/ui/Skeleton'

export function WatchlistSkeleton() {
  return (
    <div className="bg-surface rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" className="w-10 h-10" />
          <div className="space-y-2">
            <Skeleton variant="text" className="w-16 h-4" />
            <Skeleton variant="text" className="w-24 h-3" />
          </div>
        </div>
        <div className="space-y-2 text-right">
          <Skeleton variant="text" className="w-24 h-4 ml-auto" />
          <Skeleton variant="text" className="w-16 h-3 ml-auto" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="w-[100px] h-7" />
        <Skeleton variant="text" className="w-20 h-3" />
      </div>
    </div>
  )
}

export function WatchlistSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <WatchlistSkeleton key={i} />
      ))}
    </div>
  )
}
