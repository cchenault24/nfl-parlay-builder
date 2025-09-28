import React, { createContext, useContext, useEffect, useState } from 'react'
import { ProviderManager } from '../services/providers/ProviderManager'
import { useProviderStore } from '../store/providerStore'
import {
  IAIProvider,
  IDataProvider,
  ProviderSelectionCriteria,
} from '../types/providers'

interface ProviderContextValue {
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

const ProviderContext = createContext<ProviderContextValue | null>(null)

export const useProviderContext = () => {
  const context = useContext(ProviderContext)
  if (!context) {
    throw new Error('useProviderContext must be used within a ProviderProvider')
  }
  return context
}

interface ProviderProviderProps {
  children: React.ReactNode
}

export const ProviderProvider: React.FC<ProviderProviderProps> = ({
  children,
}) => {
  const [providerManager, setProviderManager] =
    useState<ProviderManager | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const { setAllProviderHealth, setHealthMonitoring } = useProviderStore()

  useEffect(() => {
    const initializeProviderManager = async () => {
      try {
        const manager = new ProviderManager({
          autoInitialize: true,
          defaultAIProvider: 'openai',
          defaultDataProvider: 'espn',
        })

        await manager.initialize()
        setProviderManager(manager)
        setIsInitialized(true)

        // Start health monitoring
        setHealthMonitoring(true)
        await refreshProviderHealth(manager)

        // Set up periodic health checks
        const healthCheckInterval = setInterval(
          async () => {
            await refreshProviderHealth(manager)
          },
          5 * 60 * 1000
        ) // Every 5 minutes

        return () => clearInterval(healthCheckInterval)
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to initialize provider manager:', error)
        }
        setIsInitialized(false)
      }
    }

    initializeProviderManager()
  }, [])

  const refreshProviderHealth = async (manager?: ProviderManager) => {
    const mgr = manager || providerManager
    if (!mgr) return

    try {
      const healthMap = mgr.getAllProviderHealth()
      setAllProviderHealth(healthMap)
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to refresh provider health:', error)
      }
    }
  }

  const getAIProvider = async (name?: string): Promise<IAIProvider> => {
    if (!providerManager) {
      throw new Error('Provider manager not initialized')
    }
    return await providerManager.getAIProvider(name)
  }

  const getDataProvider = async (name?: string): Promise<IDataProvider> => {
    if (!providerManager) {
      throw new Error('Provider manager not initialized')
    }
    return await providerManager.getDataProvider(name)
  }

  const selectBestAIProvider = async (
    criteria?:
      | 'performance'
      | 'reliability'
      | 'cost'
      | 'balanced'
      | Partial<ProviderSelectionCriteria>
  ): Promise<IAIProvider> => {
    if (!providerManager) {
      throw new Error('Provider manager not initialized')
    }
    return await providerManager.selectAIProvider(criteria || 'performance')
  }

  const selectBestDataProvider = async (
    criteria?:
      | 'performance'
      | 'reliability'
      | 'cost'
      | 'balanced'
      | Partial<ProviderSelectionCriteria>
  ): Promise<IDataProvider> => {
    if (!providerManager) {
      throw new Error('Provider manager not initialized')
    }
    return await providerManager.selectDataProvider(criteria || 'reliability')
  }

  const value: ProviderContextValue = {
    providerManager,
    isInitialized,
    getAIProvider,
    getDataProvider,
    refreshProviderHealth: () => refreshProviderHealth(),
    selectBestAIProvider,
    selectBestDataProvider,
  }

  return (
    <ProviderContext.Provider value={value}>
      {children}
    </ProviderContext.Provider>
  )
}
