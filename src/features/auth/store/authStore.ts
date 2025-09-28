import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  // User authentication state
  isAuthenticated: boolean
  user: any | null

  // Auth modal state
  authModalOpen: boolean

  // Actions
  setAuthenticated: (isAuthenticated: boolean, user?: any) => void
  setAuthModalOpen: (open: boolean) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      // Initial state
      isAuthenticated: false,
      user: null,
      authModalOpen: false,

      // Actions
      setAuthenticated: (isAuthenticated, user) =>
        set({ isAuthenticated, user: user || null }),

      setAuthModalOpen: open => set({ authModalOpen: open }),

      clearAuth: () =>
        set({ isAuthenticated: false, user: null, authModalOpen: false }),
    }),
    {
      name: 'nfl-parlay-auth-store',
      partialize: state => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
)
