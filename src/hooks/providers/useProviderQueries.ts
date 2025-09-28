import { useMutation, useQuery } from '@tanstack/react-query'
import { useProviderContext } from '../../contexts/ProviderContext'
import { useProviderStore } from '../../store/providerStore'
import { ProviderHealth } from '../../types/providers'
import {
  createMutationOptions,
  createQueryOptions,
  QUERY_KEYS,
} from '../query/useQueryConfig'

/**
 * Hook for fetching provider health status
 */
export const useProviderHealthQuery = () => {
  const { providerManager } = useProviderContext()
  const { setAllProviderHealth } = useProviderStore()

  return useQuery({
    ...createQueryOptions<Map<string, ProviderHealth>>({
      queryKey: QUERY_KEYS.PROVIDERS.HEALTH,
      staleTime: 30 * 1000, // 30 seconds for health data
      gcTime: 5 * 60 * 1000, // 5 minutes cache
      refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    }),
    queryFn: async (): Promise<Map<string, ProviderHealth>> => {
      if (!providerManager) {
        throw new Error('Provider manager not initialized')
      }

      const healthMap = providerManager.getAllProviderHealth()
      setAllProviderHealth(healthMap)
      return healthMap
    },
    enabled: !!providerManager,
  })
}

/**
 * Hook for fetching AI providers
 */
export const useAIProvidersQuery = () => {
  const { providerManager } = useProviderContext()

  return useQuery({
    ...createQueryOptions<Map<string, any>>({
      queryKey: QUERY_KEYS.PROVIDERS.AI_PROVIDERS,
      staleTime: 60 * 60 * 1000, // 1 hour for provider list
      gcTime: 24 * 60 * 60 * 1000, // 24 hours cache
    }),
    queryFn: async (): Promise<Map<string, any>> => {
      if (!providerManager) {
        throw new Error('Provider manager not initialized')
      }

      return providerManager.getAIProviders()
    },
    enabled: !!providerManager,
  })
}

/**
 * Hook for fetching data providers
 */
export const useDataProvidersQuery = () => {
  const { providerManager } = useProviderContext()

  return useQuery({
    ...createQueryOptions<Map<string, any>>({
      queryKey: QUERY_KEYS.PROVIDERS.DATA_PROVIDERS,
      staleTime: 60 * 60 * 1000, // 1 hour for provider list
      gcTime: 24 * 60 * 60 * 1000, // 24 hours cache
    }),
    queryFn: async (): Promise<Map<string, any>> => {
      if (!providerManager) {
        throw new Error('Provider manager not initialized')
      }

      return providerManager.getDataProviders()
    },
    enabled: !!providerManager,
  })
}

/**
 * Hook for refreshing provider health
 */
export const useRefreshProviderHealth = () => {
  const { refreshProviderHealth } = useProviderContext()

  return useMutation({
    ...createMutationOptions<void, Error>(),
    mutationFn: async () => {
      await refreshProviderHealth()
    },
  })
}

/**
 * Hook for testing provider connection
 */
export const useTestProviderConnection = () => {
  const { getAIProvider, getDataProvider } = useProviderContext()

  return useMutation({
    ...createMutationOptions<
      boolean,
      Error,
      { type: 'ai' | 'data'; name?: string }
    >(),
    mutationFn: async ({ type, name }): Promise<boolean> => {
      try {
        if (type === 'ai') {
          const provider = await getAIProvider(name)
          return await provider.validateConnection()
        } else {
          const provider = await getDataProvider(name)
          return await provider.validateConnection()
        }
      } catch (error) {
        console.error(`Failed to test ${type} provider connection:`, error)
        return false
      }
    },
  })
}

/**
 * Hook for getting healthy providers
 */
export const useHealthyProviders = (type: 'ai' | 'data') => {
  const { getHealthyProviders } = useProviderStore()

  return getHealthyProviders(type)
}

/**
 * Hook for provider statistics
 */
export const useProviderStatsQuery = (providerName: string) => {
  const { providerManager } = useProviderContext()
  // const { providerStats } = useProviderStore() // TODO: Use provider stats

  return useQuery({
    ...createQueryOptions<any>({
      queryKey: [...QUERY_KEYS.PROVIDERS.STATS, providerName],
      staleTime: 60 * 1000, // 1 minute for stats
      gcTime: 10 * 60 * 1000, // 10 minutes cache
    }),
    queryFn: async () => {
      if (!providerManager) {
        throw new Error('Provider manager not initialized')
      }

      return providerManager.getProviderStats(providerName)
    },
    enabled: !!providerManager && !!providerName,
  })
}
