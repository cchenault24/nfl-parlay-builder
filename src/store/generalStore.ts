import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface GeneralStore {
  // Development settings
  devMockOverride: boolean | null

  // Actions
  setDevMockOverride: (useMock: boolean | null) => void
  clearDevMockOverride: () => void
}

const useGeneralStore = create<GeneralStore>()(
  persist(
    set => ({
      // Initial state
      devMockOverride: null,

      // Actions
      setDevMockOverride: useMock => set({ devMockOverride: useMock }),
      clearDevMockOverride: () => set({ devMockOverride: null }),
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
