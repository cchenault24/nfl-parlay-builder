import { ProviderHealth } from '../types/providers'
import { createFeatureStore } from '../utils'

interface ProviderState {
  // Provider health monitoring
  providerHealth: Map<string, ProviderHealth>
  isHealthMonitoring: boolean

  // Provider selection state
  selectedAIProvider: string | null
  selectedDataProvider: string | null

  // Provider statistics
  providerStats: Map<
    string,
    {
      usageCount: number
      lastUsed?: Date
      averageResponseTime?: number
      successRate?: number
    }
  >
}

interface ProviderActions {
  // Health monitoring actions
  setProviderHealth: (name: string, health: ProviderHealth) => void
  setAllProviderHealth: (health: Map<string, ProviderHealth>) => void
  setHealthMonitoring: (enabled: boolean) => void

  // Provider selection actions
  setSelectedAIProvider: (provider: string | null) => void
  setSelectedDataProvider: (provider: string | null) => void

  // Statistics actions
  updateProviderStats: (
    name: string,
    stats: Partial<{
      usageCount: number
      lastUsed: Date
      averageResponseTime: number
      successRate: number
    }>
  ) => void

  // Getter actions
  getProviderHealth: (name: string) => ProviderHealth | undefined
  getHealthyProviders: (type: 'ai' | 'data') => string[]

  // Reset actions
  clearProviderData: () => void
}

const initialState: ProviderState = {
  providerHealth: new Map(),
  isHealthMonitoring: false,
  selectedAIProvider: null,
  selectedDataProvider: null,
  providerStats: new Map(),
}

export const useProviderStore = createFeatureStore<
  ProviderState,
  ProviderActions
>(
  initialState,
  (set, get) => ({
    // Health monitoring actions
    setProviderHealth: (name: string, health: ProviderHealth) => {
      const currentState = get()
      const newHealth = new Map(currentState.providerHealth)
      newHealth.set(name, health)
      set({ providerHealth: newHealth })
    },

    setAllProviderHealth: (health: Map<string, ProviderHealth>) =>
      set({ providerHealth: health }),

    setHealthMonitoring: (enabled: boolean) =>
      set({ isHealthMonitoring: enabled }),

    // Provider selection actions
    setSelectedAIProvider: (provider: string | null) =>
      set({ selectedAIProvider: provider }),

    setSelectedDataProvider: (provider: string | null) =>
      set({ selectedDataProvider: provider }),

    // Statistics actions
    updateProviderStats: (
      name: string,
      stats: Partial<{
        usageCount: number
        lastUsed: Date
        averageResponseTime: number
        successRate: number
      }>
    ) => {
      const currentState = get()
      const newStats = new Map(currentState.providerStats)
      const currentStats = newStats.get(name) || {
        usageCount: 0,
        lastUsed: undefined,
        averageResponseTime: undefined,
        successRate: undefined,
      }
      newStats.set(name, { ...currentStats, ...stats })
      set({ providerStats: newStats })
    },

    // Getter actions
    getProviderHealth: (name: string): ProviderHealth | undefined => {
      const state = get()
      return state.providerHealth.get(name)
    },

    getHealthyProviders: (type: 'ai' | 'data'): string[] => {
      const state = get()
      const healthy: string[] = []

      for (const [name, health] of state.providerHealth) {
        if (health.healthy && name.includes(type)) {
          healthy.push(name)
        }
      }

      return healthy
    },

    // Reset actions
    clearProviderData: () =>
      set({
        providerHealth: new Map(),
        providerStats: new Map(),
        selectedAIProvider: null,
        selectedDataProvider: null,
      }),
  }),
  {
    name: 'nfl-parlay-provider-store',
    version: 1,
    partialize: state => ({
      selectedAIProvider: state.selectedAIProvider,
      selectedDataProvider: state.selectedDataProvider,
    }),
  }
)
