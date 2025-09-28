import {
  createFeatureStore,
  createResetAction,
  createSafeMigration,
} from '../../../utils'

interface AuthState {
  // User authentication state
  isAuthenticated: boolean
  user: any | null

  // Auth modal state
  authModalOpen: boolean
}

interface AuthActions {
  // Authentication actions
  setAuthenticated: (isAuthenticated: boolean, user?: any) => void
  setUser: (user: any | null) => void

  // Modal actions
  setAuthModalOpen: (open: boolean) => void
  toggleAuthModal: () => void

  // Reset actions
  clearAuth: () => void
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  authModalOpen: false,
}

export const useAuthStore = createFeatureStore<AuthState, AuthActions>(
  initialState,
  (set, get) => ({
    // Authentication actions
    setAuthenticated: (isAuthenticated, user) =>
      set({ isAuthenticated, user: user || null }),
    setUser: user => set({ user }),

    // Modal actions
    setAuthModalOpen: open => set({ authModalOpen: open }),
    toggleAuthModal: () => {
      const currentState = get()
      set({ authModalOpen: !currentState.authModalOpen })
    },

    // Reset actions
    clearAuth: createResetAction({
      isAuthenticated: false,
      user: null,
      authModalOpen: false,
    }),
  }),
  {
    name: 'nfl-parlay-auth-store',
    version: 1,
    partialize: state => ({
      isAuthenticated: state.isAuthenticated,
      user: state.user,
    }),
    migrate: createSafeMigration(initialState, 1) as (
      persistedState: any,
      version: number
    ) => AuthState & AuthActions,
  }
)
