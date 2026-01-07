import { create } from 'zustand'
import type { Coin, AlertType, Timeframe } from '@/types'

interface AlertFormState {
  // Current wizard step (1-4)
  step: number

  // Step 1: Coin selection
  selectedCoin: Coin | null

  // Step 2: Alert type
  alertType: AlertType | null

  // Step 3: Condition
  conditionValue: string
  conditionTimeframe: Timeframe | null

  // Step 4: Options
  isRecurring: boolean
  periodicInterval: Timeframe | null

  // Actions
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: number) => void
  setSelectedCoin: (coin: Coin | null) => void
  setAlertType: (type: AlertType | null) => void
  setConditionValue: (value: string) => void
  setConditionTimeframe: (timeframe: Timeframe | null) => void
  setIsRecurring: (recurring: boolean) => void
  setPeriodicInterval: (interval: Timeframe | null) => void
  reset: () => void
  canProceed: () => boolean
}

const initialState = {
  step: 1,
  selectedCoin: null,
  alertType: null,
  conditionValue: '',
  conditionTimeframe: null,
  isRecurring: false,
  periodicInterval: null,
}

export const useAlertFormStore = create<AlertFormState>((set, get) => ({
  ...initialState,

  nextStep: () => {
    const { step, canProceed } = get()
    if (canProceed() && step < 4) {
      set({ step: step + 1 })
    }
  },

  prevStep: () => {
    const { step } = get()
    if (step > 1) {
      set({ step: step - 1 })
    }
  },

  goToStep: (newStep: number) => {
    if (newStep >= 1 && newStep <= 4) {
      set({ step: newStep })
    }
  },

  setSelectedCoin: (coin) => set({ selectedCoin: coin }),

  setAlertType: (type) => set({ alertType: type }),

  setConditionValue: (value) => set({ conditionValue: value }),

  setConditionTimeframe: (timeframe) => set({ conditionTimeframe: timeframe }),

  setIsRecurring: (recurring) => set({ isRecurring: recurring }),

  setPeriodicInterval: (interval) => set({ periodicInterval: interval }),

  reset: () => set(initialState),

  canProceed: () => {
    const state = get()

    switch (state.step) {
      case 1:
        return state.selectedCoin !== null

      case 2:
        return state.alertType !== null

      case 3: {
        const value = parseFloat(state.conditionValue)

        // For periodic alerts, no condition value needed
        if (state.alertType === 'PERIODIC') {
          return state.periodicInterval !== null
        }

        // For percentage alerts, check value is valid and timeframe selected
        if (state.alertType === 'PRICE_CHANGE_PCT') {
          return !isNaN(value) && value > 0 && state.conditionTimeframe !== null
        }

        // For price alerts, check value is valid
        return !isNaN(value) && value > 0
      }

      case 4:
        return true // Always can proceed from preview

      default:
        return false
    }
  },
}))
