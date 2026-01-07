import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './authStore'
import type { User, UserLimits } from '@/types'

describe('authStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      user: null,
      limits: null,
      token: null,
      isAuthenticated: false,
    })
  })

  const mockUser: User = {
    id: 1,
    telegramId: 123456789,
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    languageCode: 'en',
    plan: 'standard',
    notificationsUsed: 5,
    notificationsEnabled: true,
    vibrationEnabled: true,
    createdAt: '2025-01-01T00:00:00Z',
    lastActiveAt: '2025-01-07T12:00:00Z',
  }

  const mockLimits: UserLimits = {
    maxCoins: 5,
    maxAlerts: 10,
    maxNotifications: 50,
    historyRetentionDays: 7,
    coinsUsed: 2,
    alertsUsed: 3,
  }

  describe('setUser', () => {
    it('should set user and authenticate', () => {
      const { setUser } = useAuthStore.getState()

      setUser(mockUser)

      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.isAuthenticated).toBe(true)
    })

    it('should update existing user', () => {
      const { setUser } = useAuthStore.getState()

      setUser(mockUser)
      setUser({ ...mockUser, firstName: 'Updated' })

      const state = useAuthStore.getState()
      expect(state.user?.firstName).toBe('Updated')
      expect(state.isAuthenticated).toBe(true)
    })
  })

  describe('setLimits', () => {
    it('should set user limits', () => {
      const { setLimits } = useAuthStore.getState()

      setLimits(mockLimits)

      const state = useAuthStore.getState()
      expect(state.limits).toEqual(mockLimits)
    })

    it('should update existing limits', () => {
      const { setLimits } = useAuthStore.getState()

      setLimits(mockLimits)
      setLimits({ ...mockLimits, coinsUsed: 5 })

      const state = useAuthStore.getState()
      expect(state.limits?.coinsUsed).toBe(5)
    })
  })

  describe('setToken', () => {
    it('should set authentication token', () => {
      const { setToken } = useAuthStore.getState()

      setToken('test-token-123')

      const state = useAuthStore.getState()
      expect(state.token).toBe('test-token-123')
    })

    it('should update existing token', () => {
      const { setToken } = useAuthStore.getState()

      setToken('old-token')
      setToken('new-token')

      const state = useAuthStore.getState()
      expect(state.token).toBe('new-token')
    })
  })

  describe('logout', () => {
    it('should clear all auth state', () => {
      const { setUser, setLimits, setToken, logout } = useAuthStore.getState()

      // Set up authenticated state
      setUser(mockUser)
      setLimits(mockLimits)
      setToken('test-token')

      // Verify authenticated
      let state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).not.toBeNull()

      // Logout
      logout()

      // Verify cleared
      state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.limits).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })

    it('should work when already logged out', () => {
      const { logout } = useAuthStore.getState()

      logout()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('updateSettings', () => {
    it('should update notification settings', () => {
      const { setUser, updateSettings } = useAuthStore.getState()

      setUser(mockUser)
      updateSettings({ notificationsEnabled: false })

      const state = useAuthStore.getState()
      expect(state.user?.notificationsEnabled).toBe(false)
      expect(state.user?.vibrationEnabled).toBe(true) // unchanged
    })

    it('should update vibration settings', () => {
      const { setUser, updateSettings } = useAuthStore.getState()

      setUser(mockUser)
      updateSettings({ vibrationEnabled: false })

      const state = useAuthStore.getState()
      expect(state.user?.vibrationEnabled).toBe(false)
      expect(state.user?.notificationsEnabled).toBe(true) // unchanged
    })

    it('should update multiple settings at once', () => {
      const { setUser, updateSettings } = useAuthStore.getState()

      setUser(mockUser)
      updateSettings({ notificationsEnabled: false, vibrationEnabled: false })

      const state = useAuthStore.getState()
      expect(state.user?.notificationsEnabled).toBe(false)
      expect(state.user?.vibrationEnabled).toBe(false)
    })

    it('should not throw when user is null', () => {
      const { updateSettings } = useAuthStore.getState()

      // Should not throw
      updateSettings({ notificationsEnabled: false })

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
    })

    it('should preserve other user fields', () => {
      const { setUser, updateSettings } = useAuthStore.getState()

      setUser(mockUser)
      updateSettings({ notificationsEnabled: false })

      const state = useAuthStore.getState()
      expect(state.user?.firstName).toBe('Test')
      expect(state.user?.plan).toBe('standard')
      expect(state.user?.telegramId).toBe(123456789)
    })
  })

  describe('initial state', () => {
    it('should start with null values and not authenticated', () => {
      const state = useAuthStore.getState()

      expect(state.user).toBeNull()
      expect(state.limits).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('authentication flow', () => {
    it('should handle complete auth flow', () => {
      const { setToken, setUser, setLimits } = useAuthStore.getState()

      // Step 1: Set token from API
      setToken('jwt-token-from-api')

      // Step 2: Set user data
      setUser(mockUser)

      // Step 3: Set limits
      setLimits(mockLimits)

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.token).toBe('jwt-token-from-api')
      expect(state.user?.firstName).toBe('Test')
      expect(state.limits?.maxAlerts).toBe(10)
    })
  })
})
