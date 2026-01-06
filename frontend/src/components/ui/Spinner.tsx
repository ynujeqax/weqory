import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: SpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  }

  return (
    <div
      className={cn(
        'border-tg-button border-t-transparent rounded-full animate-spin',
        sizes[size],
        className
      )}
    />
  )
}

interface FullPageLoaderProps {
  message?: string
}

export function FullPageLoader({ message }: FullPageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <LoadingSpinner size="lg" />
      {message && (
        <p className="text-body text-tg-hint">{message}</p>
      )}
    </div>
  )
}

// Export as Spinner for backward compatibility
export { LoadingSpinner as Spinner }
