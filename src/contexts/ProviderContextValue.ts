import { ProviderManager } from '../services/providers/ProviderManager'
import {
  IAIProvider,
  IDataProvider,
  ProviderSelectionCriteria,
} from '../types/providers'

export interface ProviderContextValue {
  // Provider manager
  providerManager: ProviderManager | null
  isInitialized: boolean

  // Provider access
  getAIProvider: (name?: string) => Promise<IAIProvider>
  getDataProvider: (name?: string) => Promise<IDataProvider>

  // Provider health
  refreshProviderHealth: () => Promise<void>

  // Provider selection
  selectBestAIProvider: (
    criteria?:
      | 'performance'
      | 'reliability'
      | 'cost'
      | 'balanced'
      | Partial<ProviderSelectionCriteria>
  ) => Promise<IAIProvider>
  selectBestDataProvider: (
    criteria?:
      | 'performance'
      | 'reliability'
      | 'cost'
      | 'balanced'
      | Partial<ProviderSelectionCriteria>
  ) => Promise<IDataProvider>
}
