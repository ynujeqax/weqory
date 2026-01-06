import { forwardRef, type HTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    const variants = {
      default: 'bg-surface',
      elevated: 'bg-surface-elevated',
      interactive: 'bg-surface hover:bg-surface-elevated transition-colors cursor-pointer',
    }

    const paddings = {
      none: '',
      sm: 'p-sm',
      md: 'p-lg',
      lg: 'p-xl',
    }

    if (variant === 'interactive') {
      return (
        <motion.div
          ref={ref}
          whileTap={{ scale: 0.99 }}
          className={cn(
            'rounded-lg',
            variants[variant],
            paddings[padding],
            className
          )}
          {...(props as any)}
        >
          {children}
        </motion.div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg',
          variants[variant],
          paddings[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export { Card, type CardProps }
