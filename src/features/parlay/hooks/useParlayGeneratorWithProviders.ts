import { useCallback } from 'react'
import { useProviderContext } from '../../../contexts/ProviderContext'
import { useProviderStore } from '../../../store/providerStore'
import { ParlayPreferences } from '../../../types'
import { useParlayStore } from '../store/parlayStore'
import { useParlayGeneration } from './useParlayQueries'

/**
 * Enhanced parlay generation hook that demonstrates unified state management
 * with provider selection and health monitoring
 */
export const useParlayGeneratorWithProviders = () => {
  const {
    mutate: generateParlay,
    isPending: isGenerating,
    error: generationError,
    data: parlayData,
  } = useParlayGeneration()

  const {
    selectBestAIProvider,
    selectBestDataProvider,
    getAIProvider,
    getDataProvider,
  } = useProviderContext()

  const {
    selectedAIProvider,
    selectedDataProvider,
    setSelectedAIProvider,
    setSelectedDataProvider,
  } = useParlayStore()

  const { getHealthyProviders, updateProviderStats } = useProviderStore()

  // Get available healthy providers
  const availableAIProviders = getHealthyProviders('ai')
  const availableDataProviders = getHealthyProviders('data')

  // Generate parlay with automatic provider selection
  const generateWithAutoSelection = useCallback(
    async (preferences: ParlayPreferences) => {
      try {
        // Select best available providers if none selected
        let aiProvider = selectedAIProvider
        let dataProvider = selectedDataProvider

        if (!aiProvider || !availableAIProviders.includes(aiProvider)) {
          const bestAI = await selectBestAIProvider()
          aiProvider = bestAI.metadata.name
          setSelectedAIProvider(aiProvider)
        }

        if (!dataProvider || !availableDataProviders.includes(dataProvider)) {
          const bestData = await selectBestDataProvider()
          dataProvider = bestData.metadata.name
          setSelectedDataProvider(dataProvider)
        }

        // Update provider usage stats
        updateProviderStats(aiProvider, {
          usageCount: 1,
          lastUsed: new Date(),
        })
        updateProviderStats(dataProvider, {
          usageCount: 1,
          lastUsed: new Date(),
        })

        // Generate parlay with selected providers
        generateParlay(preferences)
      } catch (error) {
        console.error(
          'Failed to generate parlay with auto provider selection:',
          error
        )
        throw error
      }
    },
    [
      selectedAIProvider,
      selectedDataProvider,
      availableAIProviders,
      availableDataProviders,
      selectBestAIProvider,
      selectBestDataProvider,
      setSelectedAIProvider,
      setSelectedDataProvider,
      updateProviderStats,
      generateParlay,
    ]
  )

  // Generate parlay with specific providers
  const generateWithProviders = useCallback(
    async (
      preferences: ParlayPreferences,
      aiProviderName?: string,
      dataProviderName?: string
    ) => {
      try {
        // Use specified providers or fall back to selected/default
        const aiProvider = aiProviderName || selectedAIProvider
        const dataProvider = dataProviderName || selectedDataProvider

        if (aiProvider) {
          setSelectedAIProvider(aiProvider)
          updateProviderStats(aiProvider, {
            usageCount: 1,
            lastUsed: new Date(),
          })
        }

        if (dataProvider) {
          setSelectedDataProvider(dataProvider)
          updateProviderStats(dataProvider, {
            usageCount: 1,
            lastUsed: new Date(),
          })
        }

        generateParlay(preferences)
      } catch (error) {
        console.error(
          'Failed to generate parlay with specific providers:',
          error
        )
        throw error
      }
    },
    [
      selectedAIProvider,
      selectedDataProvider,
      setSelectedAIProvider,
      setSelectedDataProvider,
      updateProviderStats,
      generateParlay,
    ]
  )

  // Test provider connection
  const testProviderConnection = useCallback(
    async (type: 'ai' | 'data', providerName?: string) => {
      try {
        if (type === 'ai') {
          const provider = providerName
            ? await getAIProvider(providerName)
            : await selectBestAIProvider()
          return await provider.validateConnection()
        } else {
          const provider = providerName
            ? await getDataProvider(providerName)
            : await selectBestDataProvider()
          return await provider.validateConnection()
        }
      } catch (error) {
        console.error(`Failed to test ${type} provider connection:`, error)
        return false
      }
    },
    [
      getAIProvider,
      getDataProvider,
      selectBestAIProvider,
      selectBestDataProvider,
    ]
  )

  return {
    // Generation methods
    generateWithAutoSelection,
    generateWithProviders,
    generateParlay, // Direct generation with current selection

    // State
    isGenerating,
    generationError,
    parlayData,

    // Provider selection
    selectedAIProvider,
    selectedDataProvider,
    setSelectedAIProvider,
    setSelectedDataProvider,

    // Available providers
    availableAIProviders,
    availableDataProviders,

    // Utility methods
    testProviderConnection,
  }
}
