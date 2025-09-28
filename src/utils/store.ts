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
  migrate?: (persistedState: unknown, version: number) => T
}

/**
 * Create a basic store with common loading state
 * Note: This function has complex TypeScript constraints and may need manual implementation
 */
export function createBasicStore<T extends LoadingState & LoadingActions>(
  initialState: Omit<T, keyof LoadingState | keyof LoadingActions>,
  config?: StoreConfig<T>
) {
  // Simplified implementation - use createFeatureStore instead for better type safety
  if (import.meta.env.DEV) {
    console.warn(
      'createBasicStore is deprecated. Use createFeatureStore instead.'
    )
  }
  return createFeatureStore<T, Record<string, never>>(
    initialState as T,
    () => ({}),
    config as StoreConfig<T & Record<string, never>>
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
 * Note: This function has complex TypeScript constraints and may need manual implementation
 */
export function createArrayActions<T, K extends keyof T>(
  key: K,
  getArray: (state: T) => unknown[]
) {
  return {
    addItem: (item: unknown) => (state: T) => ({
      [key]: [...getArray(state), item],
    }),
    removeItem: (index: number) => (state: T) => ({
      [key]: getArray(state).filter((_: unknown, i: number) => i !== index),
    }),
    updateItem: (index: number, item: unknown) => (state: T) => {
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
export function createSelectors<T>() {
  return {
    selectLoading: (state: T) => (state as { isLoading?: boolean }).isLoading,
    selectError: (state: T) => (state as { error?: unknown }).error,
    selectHasError: (state: T) => !!(state as { error?: unknown }).error,
  }
}

// Store middleware types
type MiddlewareConfig<T> = (
  set: (partial: T | Partial<T> | ((state: T) => T | Partial<T>)) => void,
  get: () => T,
  api: unknown
) => T
type SetFunction<T> = (
  partial: T | Partial<T> | ((state: T) => T | Partial<T>)
) => void
type GetFunction<T> = () => T

/**
 * Store middleware for logging (development only)
 */
export function createLoggingMiddleware(storeName: string) {
  return <T>(config: MiddlewareConfig<T>) =>
    (set: SetFunction<T>, get: GetFunction<T>, api: unknown) =>
      config(
        (partial: T | Partial<T> | ((state: T) => T | Partial<T>)) => {
          if (import.meta.env.DEV) {
            // Only log in development and for significant changes
            if (partial && typeof partial === 'object') {
              console.info(
                `[${storeName}] Store update:`,
                Object.keys(partial as Record<string, unknown>)
              )
            }
          }
          set(partial)
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
    if (import.meta.env.DEV) {
      console.info(`Cleared store data for: ${storeName}`)
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(`Failed to clear store data for ${storeName}:`, error)
    }
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

    if (import.meta.env.DEV) {
      console.info(`Cleared ${storeKeys.length} store data entries`)
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Failed to clear store data:', error)
    }
  }
}

/**
 * Create a migration function that safely merges old state with new state
 */
export function createSafeMigration<T>(initialState: T, version: number = 1) {
  return (persistedState: unknown, persistedVersion: number): T => {
    // If versions match, return the persisted state
    if (persistedVersion === version) {
      return {
        ...initialState,
        ...(persistedState as Partial<T>),
      }
    }

    // If persisted version is older, merge safely
    if (persistedVersion < version) {
      if (import.meta.env.DEV) {
        console.info(
          `Migrating store from version ${persistedVersion} to ${version}`
        )
      }
      return {
        ...initialState,
        ...(persistedState as Partial<T>),
      }
    }

    // If persisted version is newer, use initial state (shouldn't happen in practice)
    if (import.meta.env.DEV) {
      console.warn(
        `Persisted version ${persistedVersion} is newer than current version ${version}. Using initial state.`
      )
    }
    return initialState
  }
}

/**
 * Common store types
 */
export type StoreState<T> = T
export type StoreActions<T> = T extends {
  [K in keyof T]: T[K] extends (...args: unknown[]) => unknown ? T[K] : never
}
  ? T
  : never

/**
 * Utility to create a store with common patterns
 */
export function createFeatureStore<TState, TActions>(
  initialState: TState,
  actions: (
    set: (partial: Partial<TState & TActions>) => void,
    get: () => TState & TActions
  ) => TActions,
  config?: StoreConfig<TState & TActions>
) {
  const storeConfig = {
    name: config?.name || 'nfl-parlay-feature-store',
    partialize: config?.partialize,
    version: config?.version || 1,
    migrate:
      config?.migrate ||
      ((persistedState: unknown) => {
        // Default migration: merge persisted state with initial state
        return {
          ...initialState,
          ...(persistedState as Partial<TState & TActions>),
        } as TState & TActions
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
