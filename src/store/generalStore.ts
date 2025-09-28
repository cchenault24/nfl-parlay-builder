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
  set => ({
    // Development actions
    setDevMockOverride: useMock => set({ devMockOverride: useMock }),
    toggleDevMockOverride: () => {
      const currentState = useGeneralStore.getState()
      set({ devMockOverride: !currentState.devMockOverride })
    },
    clearDevMockOverride: () => set({ devMockOverride: false }),
  }),
  {
    name: 'nfl-parlay-general-store',
    version: 1,
    partialize: state => ({
      devMockOverride: state.devMockOverride,
    }),
    migrate: createSafeMigration(initialState, 1) as (
      persistedState: any,
      version: number
    ) => GeneralState & GeneralActions,
  }
)

export default useGeneralStore
