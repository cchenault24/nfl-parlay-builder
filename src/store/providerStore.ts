import { create } from 'zustand'
import { ProviderHealth } from '../types/providers'

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

  // Actions
  setProviderHealth: (name: string, health: ProviderHealth) => void
  setAllProviderHealth: (health: Map<string, ProviderHealth>) => void
  setHealthMonitoring: (enabled: boolean) => void
  setSelectedAIProvider: (provider: string | null) => void
  setSelectedDataProvider: (provider: string | null) => void
  updateProviderStats: (
    name: string,
    stats: Partial<{
      usageCount: number
      lastUsed: Date
      averageResponseTime: number
      successRate: number
    }>
  ) => void
  getProviderHealth: (name: string) => ProviderHealth | undefined
  getHealthyProviders: (type: 'ai' | 'data') => string[]
  clearProviderData: () => void
}

export const useProviderStore = create<ProviderState>(set => ({
  // Initial state
  providerHealth: new Map(),
  isHealthMonitoring: false,
  selectedAIProvider: null,
  selectedDataProvider: null,
  providerStats: new Map(),

  // Actions
  setProviderHealth: (name, health) =>
    set(state => {
      const newHealth = new Map(state.providerHealth)
      newHealth.set(name, health)
      return { providerHealth: newHealth }
    }),

  setAllProviderHealth: health => set({ providerHealth: health }),

  setHealthMonitoring: enabled => set({ isHealthMonitoring: enabled }),

  setSelectedAIProvider: provider => set({ selectedAIProvider: provider }),

  setSelectedDataProvider: provider => set({ selectedDataProvider: provider }),

  updateProviderStats: (name, stats) =>
    set(state => {
      const newStats = new Map(state.providerStats)
      const currentStats = newStats.get(name) || {
        usageCount: 0,
        lastUsed: undefined,
        averageResponseTime: undefined,
        successRate: undefined,
      }
      newStats.set(name, { ...currentStats, ...stats })
      return { providerStats: newStats }
    }),

  getProviderHealth: name => {
    const state = useProviderStore.getState()
    return state.providerHealth.get(name)
  },

  getHealthyProviders: type => {
    const state = useProviderStore.getState()
    const healthy: string[] = []

    for (const [name, health] of state.providerHealth) {
      if (health.healthy && name.includes(type)) {
        healthy.push(name)
      }
    }

    return healthy
  },

  clearProviderData: () =>
    set({
      providerHealth: new Map(),
      providerStats: new Map(),
      selectedAIProvider: null,
      selectedDataProvider: null,
    }),
}))
