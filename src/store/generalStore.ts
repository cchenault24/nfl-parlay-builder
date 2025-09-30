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
      migrate: (
        persistedState: unknown,
        version: number
      ): Partial<GeneralStore> => {
        const state = (persistedState as Partial<GeneralStore>) || {}
        // Handle migration from older versions
        if (version === 0) {
          // If no version or version 0, return the persisted state as-is
          return state
        }

        // For future migrations, you can add version-specific logic here
        // Example:
        // if (version === 1) {
        //   return { ...persistedState, newField: defaultValue }
        // }

        return state
      },
      version: 1, // Current version of the store
    }
  )
)

export default useGeneralStore
