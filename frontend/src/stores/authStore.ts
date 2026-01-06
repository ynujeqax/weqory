import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserLimits } from '@/types'

interface AuthState {
  user: User | null
  limits: UserLimits | null
  token: string | null
  isAuthenticated: boolean

  // Actions
  setUser: (user: User) => void
  setLimits: (limits: UserLimits) => void
  setToken: (token: string) => void
  logout: () => void
  updateSettings: (settings: Partial<Pick<User, 'notificationsEnabled' | 'vibrationEnabled'>>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      limits: null,
      token: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: true }),

      setLimits: (limits) => set({ limits }),

      setToken: (token) => set({ token }),

      logout: () => set({
        user: null,
        limits: null,
        token: null,
        isAuthenticated: false,
      }),

      updateSettings: (settings) => set((state) => ({
        user: state.user ? { ...state.user, ...settings } : null,
      })),
    }),
    {
      name: 'weqory-auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
)
