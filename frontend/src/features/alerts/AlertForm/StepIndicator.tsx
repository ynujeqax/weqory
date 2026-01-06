import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
}

const STEP_LABELS = ['Coin', 'Type', 'Condition', 'Confirm']

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="relative h-1 bg-surface-elevated rounded-full mb-6">
        <motion.div
          className="absolute left-0 top-0 h-full bg-tg-button rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-between mb-2">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1
          const isCompleted = step < currentStep
          const isCurrent = step === currentStep

          return (
            <div key={step} className="flex flex-col items-center flex-1">
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-colors ${
                  isCompleted
                    ? 'bg-tg-button text-tg-button-text'
                    : isCurrent
                      ? 'bg-tg-button text-tg-button-text'
                      : 'bg-surface-elevated text-tg-hint'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-semibold">{step}</span>
                )}
              </motion.div>
              <span
                className={`text-xs ${
                  isCurrent ? 'text-tg-text font-medium' : 'text-tg-hint'
                }`}
              >
                {STEP_LABELS[i]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
