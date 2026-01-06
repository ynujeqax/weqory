import { Skeleton } from '@/components/ui/Skeleton'

export function HistorySkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((group) => (
        <div key={group} className="space-y-3">
          {/* Date header skeleton */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-24" />
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Cards skeleton */}
          <div className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="bg-surface rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <Skeleton className="w-10 h-10 rounded-full" />

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-3 w-32" />
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </div>

                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
