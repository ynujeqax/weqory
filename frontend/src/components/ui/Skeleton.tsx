import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
}

export function Skeleton({ className, variant = 'rectangular' }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-surface-elevated animate-pulse',
        {
          'h-4 rounded': variant === 'text',
          'rounded-full': variant === 'circular',
          'rounded-lg': variant === 'rectangular',
        },
        className
      )}
    />
  )
}

// Specialized skeleton components for common use cases
export function CoinSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4">
      <Skeleton variant="circular" className="w-10 h-10" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-24" />
        <Skeleton variant="text" className="w-16 h-3" />
      </div>
      <div className="space-y-2 text-right">
        <Skeleton variant="text" className="w-20 ml-auto" />
        <Skeleton variant="text" className="w-14 h-3 ml-auto" />
      </div>
    </div>
  )
}

export function AlertSkeleton() {
  return (
    <div className="p-4 space-y-3 bg-surface rounded-lg">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="w-32" />
        <Skeleton variant="text" className="w-16 h-6" />
      </div>
      <Skeleton variant="text" className="w-full" />
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="w-24 h-3" />
        <Skeleton variant="text" className="w-20 h-3" />
      </div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="w-full h-48" />
      <div className="flex justify-between">
        <Skeleton variant="text" className="w-16 h-3" />
        <Skeleton variant="text" className="w-16 h-3" />
        <Skeleton variant="text" className="w-16 h-3" />
      </div>
    </div>
  )
}
