import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface GeneralStore {
  // Development settings
  devMockOverride: boolean

  // Actions
  setDevMockOverride: (useMock: boolean) => void
  clearDevMockOverride: () => void
}

const useGeneralStore = create<GeneralStore>()(
  persist(
    set => ({
      // Initial state
      devMockOverride: import.meta.env.MODE === 'development',

      // Actions
      setDevMockOverride: useMock => set({ devMockOverride: useMock }),
      clearDevMockOverride: () => set({ devMockOverride: false }),
    }),
    {
      name: 'nfl-parlay-general-store', // localStorage key
      partialize: state => ({
        devMockOverride: state.devMockOverride,
      }), // Only persist the dev override
    }
  )
)

export default useGeneralStore
