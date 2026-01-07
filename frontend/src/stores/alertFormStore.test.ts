import { describe, it, expect, beforeEach } from 'vitest'
import { useAlertFormStore } from './alertFormStore'
import type { Coin } from '@/types'

describe('alertFormStore', () => {
  const mockCoin: Coin = {
    id: 1,
    symbol: 'BTC',
    name: 'Bitcoin',
    binanceSymbol: 'BTCUSDT',
    isStablecoin: false,
    rank: 1,
    currentPrice: 50000,
  }

  beforeEach(() => {
    // Reset store before each test
    useAlertFormStore.getState().reset()
  })

  describe('initial state', () => {
    it('should start at step 1', () => {
      const state = useAlertFormStore.getState()
      expect(state.step).toBe(1)
    })

    it('should have null values initially', () => {
      const state = useAlertFormStore.getState()
      expect(state.selectedCoin).toBeNull()
      expect(state.alertType).toBeNull()
      expect(state.conditionValue).toBe('')
      expect(state.conditionTimeframe).toBeNull()
      expect(state.isRecurring).toBe(false)
      expect(state.periodicInterval).toBeNull()
    })
  })

  describe('setSelectedCoin', () => {
    it('should set selected coin', () => {
      const { setSelectedCoin } = useAlertFormStore.getState()

      setSelectedCoin(mockCoin)

      const state = useAlertFormStore.getState()
      expect(state.selectedCoin).toEqual(mockCoin)
    })

    it('should allow clearing coin', () => {
      const { setSelectedCoin } = useAlertFormStore.getState()

      setSelectedCoin(mockCoin)
      setSelectedCoin(null)

      const state = useAlertFormStore.getState()
      expect(state.selectedCoin).toBeNull()
    })
  })

  describe('setAlertType', () => {
    it('should set alert type', () => {
      const { setAlertType } = useAlertFormStore.getState()

      setAlertType('PRICE_ABOVE')

      const state = useAlertFormStore.getState()
      expect(state.alertType).toBe('PRICE_ABOVE')
    })

    it('should handle all alert types', () => {
      const { setAlertType } = useAlertFormStore.getState()
      const types = ['PRICE_ABOVE', 'PRICE_BELOW', 'PRICE_CHANGE_PCT', 'PERIODIC'] as const

      for (const type of types) {
        setAlertType(type)
        expect(useAlertFormStore.getState().alertType).toBe(type)
      }
    })
  })

  describe('setConditionValue', () => {
    it('should set condition value', () => {
      const { setConditionValue } = useAlertFormStore.getState()

      setConditionValue('50000')

      const state = useAlertFormStore.getState()
      expect(state.conditionValue).toBe('50000')
    })

    it('should handle decimal values', () => {
      const { setConditionValue } = useAlertFormStore.getState()

      setConditionValue('5.5')

      const state = useAlertFormStore.getState()
      expect(state.conditionValue).toBe('5.5')
    })
  })

  describe('setConditionTimeframe', () => {
    it('should set timeframe', () => {
      const { setConditionTimeframe } = useAlertFormStore.getState()

      setConditionTimeframe('1h')

      const state = useAlertFormStore.getState()
      expect(state.conditionTimeframe).toBe('1h')
    })

    it('should handle all timeframes', () => {
      const { setConditionTimeframe } = useAlertFormStore.getState()
      const timeframes = ['5m', '15m', '30m', '1h', '4h', '24h'] as const

      for (const tf of timeframes) {
        setConditionTimeframe(tf)
        expect(useAlertFormStore.getState().conditionTimeframe).toBe(tf)
      }
    })
  })

  describe('setIsRecurring', () => {
    it('should toggle recurring', () => {
      const { setIsRecurring } = useAlertFormStore.getState()

      setIsRecurring(true)
      expect(useAlertFormStore.getState().isRecurring).toBe(true)

      setIsRecurring(false)
      expect(useAlertFormStore.getState().isRecurring).toBe(false)
    })
  })

  describe('setPeriodicInterval', () => {
    it('should set periodic interval', () => {
      const { setPeriodicInterval } = useAlertFormStore.getState()

      setPeriodicInterval('4h')

      const state = useAlertFormStore.getState()
      expect(state.periodicInterval).toBe('4h')
    })
  })

  describe('step navigation', () => {
    describe('nextStep', () => {
      it('should not advance without coin selected', () => {
        const { nextStep } = useAlertFormStore.getState()

        nextStep()

        expect(useAlertFormStore.getState().step).toBe(1)
      })

      it('should advance from step 1 with coin selected', () => {
        const { setSelectedCoin, nextStep } = useAlertFormStore.getState()

        setSelectedCoin(mockCoin)
        nextStep()

        expect(useAlertFormStore.getState().step).toBe(2)
      })

      it('should not advance from step 2 without alert type', () => {
        const { setSelectedCoin, nextStep, goToStep } = useAlertFormStore.getState()

        setSelectedCoin(mockCoin)
        goToStep(2)
        nextStep()

        expect(useAlertFormStore.getState().step).toBe(2)
      })

      it('should advance from step 2 with alert type', () => {
        const { setSelectedCoin, setAlertType, nextStep, goToStep } = useAlertFormStore.getState()

        setSelectedCoin(mockCoin)
        goToStep(2)
        setAlertType('PRICE_ABOVE')
        nextStep()

        expect(useAlertFormStore.getState().step).toBe(3)
      })

      it('should not exceed step 4', () => {
        const store = useAlertFormStore.getState()

        store.setSelectedCoin(mockCoin)
        store.setAlertType('PRICE_ABOVE')
        store.setConditionValue('50000')
        store.goToStep(4)
        store.nextStep()

        expect(useAlertFormStore.getState().step).toBe(4)
      })
    })

    describe('prevStep', () => {
      it('should go back one step', () => {
        const { goToStep, prevStep } = useAlertFormStore.getState()

        goToStep(3)
        prevStep()

        expect(useAlertFormStore.getState().step).toBe(2)
      })

      it('should not go below step 1', () => {
        const { prevStep } = useAlertFormStore.getState()

        prevStep()

        expect(useAlertFormStore.getState().step).toBe(1)
      })
    })

    describe('goToStep', () => {
      it('should go to specific step', () => {
        const { goToStep } = useAlertFormStore.getState()

        goToStep(3)

        expect(useAlertFormStore.getState().step).toBe(3)
      })

      it('should not go below 1', () => {
        const { goToStep } = useAlertFormStore.getState()

        goToStep(0)

        expect(useAlertFormStore.getState().step).toBe(1)
      })

      it('should not go above 4', () => {
        const { goToStep } = useAlertFormStore.getState()

        goToStep(5)

        expect(useAlertFormStore.getState().step).toBe(1)
      })
    })
  })

  describe('canProceed', () => {
    describe('step 1', () => {
      it('should return false without coin', () => {
        const { canProceed } = useAlertFormStore.getState()
        expect(canProceed()).toBe(false)
      })

      it('should return true with coin', () => {
        const { setSelectedCoin, canProceed } = useAlertFormStore.getState()

        setSelectedCoin(mockCoin)

        expect(canProceed()).toBe(true)
      })
    })

    describe('step 2', () => {
      it('should return false without alert type', () => {
        const { setSelectedCoin, goToStep, canProceed } = useAlertFormStore.getState()

        setSelectedCoin(mockCoin)
        goToStep(2)

        expect(canProceed()).toBe(false)
      })

      it('should return true with alert type', () => {
        const { setSelectedCoin, setAlertType, goToStep, canProceed } = useAlertFormStore.getState()

        setSelectedCoin(mockCoin)
        goToStep(2)
        setAlertType('PRICE_ABOVE')

        expect(canProceed()).toBe(true)
      })
    })

    describe('step 3 - PRICE_ABOVE/BELOW', () => {
      it('should return false without condition value', () => {
        const store = useAlertFormStore.getState()

        store.setSelectedCoin(mockCoin)
        store.setAlertType('PRICE_ABOVE')
        store.goToStep(3)

        expect(store.canProceed()).toBe(false)
      })

      it('should return false with invalid value', () => {
        const store = useAlertFormStore.getState()

        store.setSelectedCoin(mockCoin)
        store.setAlertType('PRICE_ABOVE')
        store.setConditionValue('invalid')
        store.goToStep(3)

        expect(useAlertFormStore.getState().canProceed()).toBe(false)
      })

      it('should return false with zero value', () => {
        const store = useAlertFormStore.getState()

        store.setSelectedCoin(mockCoin)
        store.setAlertType('PRICE_ABOVE')
        store.setConditionValue('0')
        store.goToStep(3)

        expect(useAlertFormStore.getState().canProceed()).toBe(false)
      })

      it('should return true with valid value', () => {
        const store = useAlertFormStore.getState()

        store.setSelectedCoin(mockCoin)
        store.setAlertType('PRICE_ABOVE')
        store.setConditionValue('50000')
        store.goToStep(3)

        expect(useAlertFormStore.getState().canProceed()).toBe(true)
      })
    })

    describe('step 3 - PRICE_CHANGE_PCT', () => {
      it('should require timeframe', () => {
        const store = useAlertFormStore.getState()

        store.setSelectedCoin(mockCoin)
        store.setAlertType('PRICE_CHANGE_PCT')
        store.setConditionValue('5')
        store.goToStep(3)

        expect(useAlertFormStore.getState().canProceed()).toBe(false)
      })

      it('should return true with value and timeframe', () => {
        const store = useAlertFormStore.getState()

        store.setSelectedCoin(mockCoin)
        store.setAlertType('PRICE_CHANGE_PCT')
        store.setConditionValue('5')
        store.setConditionTimeframe('1h')
        store.goToStep(3)

        expect(useAlertFormStore.getState().canProceed()).toBe(true)
      })
    })

    describe('step 3 - PERIODIC', () => {
      it('should require periodic interval', () => {
        const store = useAlertFormStore.getState()

        store.setSelectedCoin(mockCoin)
        store.setAlertType('PERIODIC')
        store.goToStep(3)

        expect(useAlertFormStore.getState().canProceed()).toBe(false)
      })

      it('should return true with interval', () => {
        const store = useAlertFormStore.getState()

        store.setSelectedCoin(mockCoin)
        store.setAlertType('PERIODIC')
        store.setPeriodicInterval('1h')
        store.goToStep(3)

        expect(useAlertFormStore.getState().canProceed()).toBe(true)
      })
    })

    describe('step 4', () => {
      it('should always return true', () => {
        const { goToStep, canProceed } = useAlertFormStore.getState()

        goToStep(4)

        expect(canProceed()).toBe(true)
      })
    })
  })

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      const store = useAlertFormStore.getState()

      // Set various state
      store.setSelectedCoin(mockCoin)
      store.setAlertType('PRICE_ABOVE')
      store.setConditionValue('50000')
      store.setConditionTimeframe('1h')
      store.setIsRecurring(true)
      store.setPeriodicInterval('4h')
      store.goToStep(3)

      // Reset
      store.reset()

      const state = useAlertFormStore.getState()
      expect(state.step).toBe(1)
      expect(state.selectedCoin).toBeNull()
      expect(state.alertType).toBeNull()
      expect(state.conditionValue).toBe('')
      expect(state.conditionTimeframe).toBeNull()
      expect(state.isRecurring).toBe(false)
      expect(state.periodicInterval).toBeNull()
    })
  })

  describe('complete form flow', () => {
    it('should handle complete PRICE_ABOVE flow', () => {
      const store = useAlertFormStore.getState()

      // Step 1: Select coin
      store.setSelectedCoin(mockCoin)
      expect(store.canProceed()).toBe(true)
      store.nextStep()

      // Step 2: Select alert type
      expect(useAlertFormStore.getState().step).toBe(2)
      store.setAlertType('PRICE_ABOVE')
      expect(useAlertFormStore.getState().canProceed()).toBe(true)
      useAlertFormStore.getState().nextStep()

      // Step 3: Set condition
      expect(useAlertFormStore.getState().step).toBe(3)
      useAlertFormStore.getState().setConditionValue('55000')
      expect(useAlertFormStore.getState().canProceed()).toBe(true)
      useAlertFormStore.getState().nextStep()

      // Step 4: Preview
      expect(useAlertFormStore.getState().step).toBe(4)
      const finalState = useAlertFormStore.getState()
      expect(finalState.selectedCoin?.symbol).toBe('BTC')
      expect(finalState.alertType).toBe('PRICE_ABOVE')
      expect(finalState.conditionValue).toBe('55000')
    })

    it('should handle complete PERIODIC flow', () => {
      const store = useAlertFormStore.getState()

      store.setSelectedCoin(mockCoin)
      store.nextStep()

      useAlertFormStore.getState().setAlertType('PERIODIC')
      useAlertFormStore.getState().nextStep()

      useAlertFormStore.getState().setPeriodicInterval('4h')
      expect(useAlertFormStore.getState().canProceed()).toBe(true)
      useAlertFormStore.getState().nextStep()

      expect(useAlertFormStore.getState().step).toBe(4)
      expect(useAlertFormStore.getState().periodicInterval).toBe('4h')
    })
  })
})
