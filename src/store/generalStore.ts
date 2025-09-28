import { createFeatureStore, createSafeMigration } from '../utils'

interface GeneralState {
  // Development settings
  devMockOverride: boolean
}

interface GeneralActions {
  // Development actions
  setDevMockOverride: (useMock: boolean) => void
  toggleDevMockOverride: () => void
  clearDevMockOverride: () => void
}

const initialState: GeneralState = {
  devMockOverride: import.meta.env.MODE === 'development',
}

const useGeneralStore = createFeatureStore<GeneralState, GeneralActions>(
  initialState,
  (set, get) => ({
    // Development actions
    setDevMockOverride: useMock => set({ devMockOverride: useMock }),
    toggleDevMockOverride: () => {
      const current = get().devMockOverride
      set({ devMockOverride: !current })
    },
    clearDevMockOverride: () => set({ devMockOverride: false }),
  }),
  {
    name: 'nfl-parlay-general-store',
    version: 1,
    partialize: (state: GeneralState) => ({
      devMockOverride: state.devMockOverride,
    }),
    migrate: createSafeMigration(initialState, 1) as (
      persistedState: unknown,
      version: number
    ) => GeneralState & GeneralActions,
  }
)

export default useGeneralStore
