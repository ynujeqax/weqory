import { forwardRef } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useTelegram } from '@/hooks/useTelegram'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, onClick, type = 'button', ...props }, ref) => {
    const { hapticFeedback } = useTelegram()

    const handleClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      hapticFeedback('light')
      onClick?.(e)
    }

    const variants = {
      primary: 'bg-tg-button text-tg-button-text hover:opacity-90',
      secondary: 'bg-surface-elevated text-tg-text hover:bg-surface-hover',
      ghost: 'bg-transparent text-tg-text hover:bg-surface-elevated',
      danger: 'bg-danger text-white hover:opacity-90',
    }

    const sizes = {
      sm: 'h-9 px-3 text-body-sm',
      md: 'h-11 px-4 text-body',
      lg: 'h-12 px-6 text-body-lg',
    }

    return (
      <motion.button
        ref={ref}
        type={type}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.1 }}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md font-medium',
          'transition-colors duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        onClick={handleClick}
        {...props}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

export { Button, type ButtonProps }
