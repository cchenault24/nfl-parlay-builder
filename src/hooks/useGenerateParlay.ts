import { useMutation } from '@tanstack/react-query'
import { container } from '../services/container'
import useGeneralStore from '../store/generalStore'
import useParlayStore from '../store/parlayStore'
import { GeneratedParlay, ParlayOptions } from '../types'

// Allow passing provider through options without changing shared types
type WithProvider<T> = T & { provider?: 'mock' | 'openai' }

type Vars = { gameId: string; options?: WithProvider<ParlayOptions> }

export function useGenerateParlay() {
  const setParlay = useParlayStore(state => state.setParlay)
  const devMockOverride = useGeneralStore(state => state.devMockOverride)

  return useMutation<GeneratedParlay, Error, Vars>({
    mutationKey: ['generateParlay', devMockOverride], // Include provider in cache key
    mutationFn: async ({
      gameId,
      options = {} as WithProvider<ParlayOptions>,
    }) => {
      // DETAILED DEBUGGING
      console.log('🔍 FRONTEND DEBUG: Provider selection logic', {
        devMockOverride,
        mode: import.meta.env.MODE,
        localStorageValue: localStorage.getItem('nfl-parlay-general-store'),
        originalOptions: options,
      })

      // CRITICAL: Pass provider selection based on DevStatus toggle
      const provider = devMockOverride ? 'mock' : 'openai'
      const enhancedOptions = {
        ...options,
        provider,
      } as unknown as ParlayOptions

      console.log('🎯 FRONTEND DEBUG: Sending request with options:', {
        gameId,
        provider,
        devMockOverride,
        toggleState: devMockOverride ? 'MOCK DATA' : 'REAL DATA',
        enhancedOptions,
      })

      const result = await container.parlay.generate(gameId, enhancedOptions)

      console.log('📦 FRONTEND DEBUG: Response received:', {
        hasGameSummary: !!(result as any).gameSummary,
        legCount: result.legs?.length || 0,
        responseMetadata: (result as any).metadata,
      })

      return result
    },
    onSuccess: (data, variables) => {
      const provider = devMockOverride ? 'mock' : 'openai'
      console.log('✅ FRONTEND DEBUG: Generation successful:', {
        gameId: variables.gameId,
        requestedProvider: provider,
        hasGameSummary: !!(data as any).gameSummary,
        legCount: data.legs?.length || 0,
        toggleState: devMockOverride ? 'MOCK DATA' : 'REAL DATA',
      })

      // Automatically update the parlay store when generation succeeds
      setParlay(data)
    },
    onError: (error, variables) => {
      const provider = devMockOverride ? 'mock' : 'openai'
      console.error('❌ FRONTEND DEBUG: Generation failed:', {
        error: error.message,
        gameId: variables.gameId,
        requestedProvider: provider,
        toggleState: devMockOverride ? 'MOCK DATA' : 'REAL DATA',
      })

      // Clear any existing parlay on error
      setParlay(null)
    },
  })
}
