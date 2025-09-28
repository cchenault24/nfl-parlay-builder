import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ------------------------------------------------------------------------------------------------
// Shared Store Utilities
// ------------------------------------------------------------------------------------------------

/**
 * Common loading state interface
 */
export interface LoadingState {
  isLoading: boolean
  error: string | null
}

/**
 * Common loading state actions
 */
export interface LoadingActions {
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

/**
 * Common store configuration
 */
export interface StoreConfig<T> {
  name: string
  partialize?: (state: T) => Partial<T>
  version?: number
  migrate?: (persistedState: any, version: number) => T
}

/**
 * Create a basic store with common loading state
 */
export function createBasicStore<T extends LoadingState & LoadingActions>(
  initialState: Omit<T, keyof LoadingState | keyof LoadingActions>,
  config?: StoreConfig<T>
) {
  const storeConfig = {
    name: config?.name || 'nfl-parlay-store',
    partialize: config?.partialize,
    version: config?.version || 1,
    migrate:
      config?.migrate ||
      ((persistedState: any, version: number) => {
        // Default migration: merge persisted state with initial state
        return {
          ...initialState,
          isLoading: false,
          error: null,
          ...persistedState,
        }
      }),
  }

  return create<T>()(
    persist(
      set => ({
        ...initialState,
        isLoading: false,
        error: null,
        setLoading: (loading: boolean) => set({ isLoading: loading }),
        setError: (error: string | null) => set({ error }),
        clearError: () => set({ error: null }),
      }),
      storeConfig
    )
  )
}

/**
 * Create a store without persistence
 */
export function createSimpleStore<T>(
  initialState: T,
  actions: (set: (partial: Partial<T>) => void) => Partial<T>
) {
  return create<T>()(set => ({
    ...initialState,
    ...actions(set),
  }))
}

/**
 * Common reset action creator
 */
export function createResetAction<T>(resetState: Partial<T>) {
  return () => resetState
}

/**
 * Common setter action creators
 */
export function createSetterActions<T>() {
  return {
    setValue:
      <K extends keyof T>(key: K) =>
      (value: T[K]) => ({ [key]: value }),
    setValues: (values: Partial<T>) => values,
  }
}

/**
 * Common boolean toggle action creator
 */
export function createToggleAction<T>(key: keyof T) {
  return (state: T) => ({ [key]: !state[key] })
}

/**
 * Common array action creators
 */
export function createArrayActions<T, K extends keyof T>(
  key: K,
  getArray: (state: T) => T[K][]
) {
  return {
    addItem: (item: T[K][0]) => (state: T) => ({
      [key]: [...getArray(state), item],
    }),
    removeItem: (index: number) => (state: T) => ({
      [key]: getArray(state).filter((_, i) => i !== index),
    }),
    updateItem: (index: number, item: T[K][0]) => (state: T) => {
      const array = [...getArray(state)]
      array[index] = item
      return { [key]: array }
    },
    clearArray: () => ({ [key]: [] }),
  }
}

/**
 * Common store selectors
 */
export function createSelectors<T>(store: any) {
  return {
    selectLoading: (state: T) => (state as any).isLoading,
    selectError: (state: T) => (state as any).error,
    selectHasError: (state: T) => !!(state as any).error,
  }
}

/**
 * Store middleware for logging (development only)
 */
export function createLoggingMiddleware<T>() {
  return (config: any) => (set: any, get: any, api: any) =>
    config(
      (...args: any[]) => {
        if (import.meta.env.DEV) {
          console.log('Store update:', args)
        }
        set(...args)
      },
      get,
      api
    )
}

/**
 * Clear localStorage for a specific store
 */
export function clearStoreFromStorage(storeName: string): void {
  try {
    localStorage.removeItem(storeName)
    console.log(`Cleared store data for: ${storeName}`)
  } catch (error) {
    console.error(`Failed to clear store data for ${storeName}:`, error)
  }
}

/**
 * Clear all store data from localStorage
 */
export function clearAllStoreData(): void {
  try {
    const keys = Object.keys(localStorage)
    const storeKeys = keys.filter(key => key.startsWith('nfl-parlay-'))

    storeKeys.forEach(key => {
      localStorage.removeItem(key)
    })

    console.log(`Cleared ${storeKeys.length} store data entries`)
  } catch (error) {
    console.error('Failed to clear store data:', error)
  }
}

/**
 * Create a migration function that safely merges old state with new state
 */
export function createSafeMigration<T>(initialState: T, version: number = 1) {
  return (persistedState: any, persistedVersion: number): T => {
    // If versions match, return the persisted state
    if (persistedVersion === version) {
      return {
        ...initialState,
        ...persistedState,
      }
    }

    // If persisted version is older, merge safely
    if (persistedVersion < version) {
      console.log(
        `Migrating store from version ${persistedVersion} to ${version}`
      )
      return {
        ...initialState,
        ...persistedState,
      }
    }

    // If persisted version is newer, use initial state (shouldn't happen in practice)
    console.warn(
      `Persisted version ${persistedVersion} is newer than current version ${version}. Using initial state.`
    )
    return initialState
  }
}

/**
 * Common store types
 */
export type StoreState<T> = T
export type StoreActions<T> = T extends {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? T[K] : never
}
  ? T
  : never

/**
 * Utility to create a store with common patterns
 */
export function createFeatureStore<TState, TActions>(
  initialState: TState,
  actions: (
    set: (partial: Partial<TState>) => void,
    get: () => TState
  ) => TActions,
  config?: StoreConfig<TState & TActions>
) {
  const storeConfig = {
    name: config?.name || 'nfl-parlay-feature-store',
    partialize: config?.partialize,
    version: config?.version || 1,
    migrate:
      config?.migrate ||
      ((persistedState: any, version: number) => {
        // Default migration: merge persisted state with initial state
        return {
          ...initialState,
          ...persistedState,
        }
      }),
  }

  return create<TState & TActions>()(
    persist(
      (set, get) => ({
        ...initialState,
        ...actions(set, get),
      }),
      storeConfig
    )
  )
}
