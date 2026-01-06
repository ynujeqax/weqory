import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { hapticFeedback } from '@telegram-apps/sdk'
import { useAlertFormStore } from '@/stores/alertFormStore'
import { useCreateAlert } from '@/api/hooks'
import { Button } from '@/components/ui/Button'
import { StepIndicator } from '@/features/alerts/AlertForm/StepIndicator'
import { CoinSelector } from '@/features/alerts/AlertForm/CoinSelector'
import { AlertTypeSelector } from '@/features/alerts/AlertForm/AlertTypeSelector'
import { ConditionInput } from '@/features/alerts/AlertForm/ConditionInput'
import { AlertOptions } from '@/features/alerts/AlertForm/AlertOptions'
import { useToast } from '@/hooks/useToast'

export default function CreateAlertPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const {
    step,
    selectedCoin,
    alertType,
    conditionValue,
    conditionTimeframe,
    periodicInterval,
    isRecurring,
    nextStep,
    prevStep,
    setSelectedCoin,
    setAlertType,
    setConditionValue,
    setConditionTimeframe,
    setPeriodicInterval,
    setIsRecurring,
    reset,
    canProceed,
  } = useAlertFormStore()

  const createAlert = useCreateAlert()

  useEffect(() => {
    return () => {
      reset()
    }
  }, [reset])

  const handleBack = () => {
    if (step === 1) {
      navigate('/alerts')
    } else {
      hapticFeedback.impactOccurred('light')
      prevStep()
    }
  }

  const handleNext = () => {
    if (!canProceed()) return

    hapticFeedback.impactOccurred('light')

    if (step === 4) {
      handleSubmit()
    } else {
      nextStep()
    }
  }

  const handleSubmit = async () => {
    if (!selectedCoin || !alertType) return

    try {
      const value = parseFloat(conditionValue)

      await createAlert.mutateAsync({
        coin_symbol: selectedCoin.symbol,
        alert_type: alertType,
        condition_value: isNaN(value) ? 0 : value,
        condition_timeframe: conditionTimeframe || undefined,
        is_recurring: isRecurring,
        periodic_interval: periodicInterval || undefined,
      })

      hapticFeedback.notificationOccurred('success')
      showToast({
        type: 'success',
        message: 'Alert created successfully',
      })

      reset()
      navigate('/alerts')
    } catch (error) {
      hapticFeedback.notificationOccurred('error')
      showToast({
        type: 'error',
        message: 'Failed to create alert',
      })
    }
  }

  const handleClose = () => {
    reset()
    navigate('/alerts')
  }

  return (
    <div className="min-h-screen bg-tg-bg pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-tg-bg/95 backdrop-blur-xl border-b border-white/5">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-lg hover:bg-surface-hover transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-tg-text" />
            </button>
            <h1 className="text-lg font-semibold text-tg-text">Create Alert</h1>
            <button
              onClick={handleClose}
              className="p-2 -mr-2 rounded-lg hover:bg-surface-hover transition-colors"
            >
              <X className="w-6 h-6 text-tg-hint" />
            </button>
          </div>
          <StepIndicator currentStep={step} totalSteps={4} />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Step 1: Select Coin */}
            {step === 1 && (
              <div>
                <h2 className="text-xl font-semibold text-tg-text mb-2">Select Coin</h2>
                <p className="text-sm text-tg-hint mb-6">
                  Choose a coin from your watchlist to set an alert
                </p>
                <CoinSelector selectedCoin={selectedCoin} onSelect={setSelectedCoin} />
              </div>
            )}

            {/* Step 2: Select Alert Type */}
            {step === 2 && (
              <div>
                <h2 className="text-xl font-semibold text-tg-text mb-2">Alert Type</h2>
                <p className="text-sm text-tg-hint mb-6">
                  Choose what kind of alert you want to create
                </p>
                <AlertTypeSelector selectedType={alertType} onSelect={setAlertType} />
              </div>
            )}

            {/* Step 3: Set Condition */}
            {step === 3 && selectedCoin && alertType && (
              <div>
                <h2 className="text-xl font-semibold text-tg-text mb-2">Set Condition</h2>
                <p className="text-sm text-tg-hint mb-6">
                  Define when this alert should trigger
                </p>
                <ConditionInput
                  alertType={alertType}
                  selectedCoin={selectedCoin}
                  conditionValue={conditionValue}
                  conditionTimeframe={conditionTimeframe}
                  periodicInterval={periodicInterval}
                  onValueChange={setConditionValue}
                  onTimeframeChange={setConditionTimeframe}
                  onPeriodicIntervalChange={setPeriodicInterval}
                />
              </div>
            )}

            {/* Step 4: Options & Confirm */}
            {step === 4 && selectedCoin && alertType && (
              <div>
                <h2 className="text-xl font-semibold text-tg-text mb-2">Confirm Alert</h2>
                <p className="text-sm text-tg-hint mb-6">
                  Review your alert settings and create
                </p>
                <AlertOptions
                  selectedCoin={selectedCoin}
                  alertType={alertType}
                  conditionValue={conditionValue}
                  conditionTimeframe={conditionTimeframe}
                  periodicInterval={periodicInterval}
                  isRecurring={isRecurring}
                  onRecurringChange={setIsRecurring}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-tg-bg/95 backdrop-blur-xl border-t border-white/5">
        <Button
          onClick={handleNext}
          disabled={!canProceed()}
          isLoading={createAlert.isPending}
          className="w-full"
          size="lg"
        >
          {step === 4 ? 'Create Alert' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
