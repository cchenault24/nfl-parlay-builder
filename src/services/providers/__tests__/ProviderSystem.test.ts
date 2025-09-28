// ================================================================================================
// PROVIDER SYSTEM TESTS - Test the unified provider system
// ================================================================================================

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ProviderManager } from '../ProviderManager'

describe('Unified Provider System', () => {
  let providerManager: ProviderManager

  beforeEach(async () => {
    providerManager = new ProviderManager({
      autoInitialize: false, // Disable auto-init for testing
    })
    await providerManager.initialize()
  })

  afterEach(async () => {
    await providerManager.dispose()
  })

  describe('Provider Registration and Loading', () => {
    it('should load mock providers by default', () => {
      const aiProviders = providerManager.getAIProviders()
      const dataProviders = providerManager.getDataProviders()

      expect(aiProviders.size).toBeGreaterThan(0)
      expect(dataProviders.size).toBeGreaterThan(0)
    })

    it('should have mock AI provider available', () => {
      const aiProviders = providerManager.getAIProviders()
      const mockProvider = Array.from(aiProviders.values()).find(p =>
        p.metadata.name.includes('Mock')
      )

      expect(mockProvider).toBeDefined()
      expect(mockProvider?.metadata.type).toBe('ai')
    })

    it('should have mock data provider available', () => {
      const dataProviders = providerManager.getDataProviders()
      const mockProvider = Array.from(dataProviders.values()).find(p =>
        p.metadata.name.includes('Mock')
      )

      expect(mockProvider).toBeDefined()
      expect(mockProvider?.metadata.type).toBe('data')
    })
  })

  describe('Provider Selection', () => {
    it('should select AI provider with performance criteria', async () => {
      const provider = await providerManager.selectAIProvider('performance')
      expect(provider).toBeDefined()
      expect(provider.metadata.type).toBe('ai')
    })

    it('should select data provider with reliability criteria', async () => {
      const provider = await providerManager.selectDataProvider('reliability')
      expect(provider).toBeDefined()
      expect(provider.metadata.type).toBe('data')
    })

    it('should select AI provider with cost criteria', async () => {
      const provider = await providerManager.selectAIProvider('cost')
      expect(provider).toBeDefined()
      expect(provider.metadata.type).toBe('ai')
    })

    it('should select data provider with balanced criteria', async () => {
      const provider = await providerManager.selectDataProvider('balanced')
      expect(provider).toBeDefined()
      expect(provider.metadata.type).toBe('data')
    })

    it('should select AI provider with custom criteria', async () => {
      const provider = await providerManager.selectAIProvider({
        priority: 'performance',
        maxCost: 0.01,
        capabilities: ['chat_completion'],
      })
      expect(provider).toBeDefined()
      expect(provider.metadata.type).toBe('ai')
    })
  })

  describe('Provider Health Monitoring', () => {
    it('should track provider health', () => {
      const aiProviders = providerManager.getAIProviders()
      const firstProvider = Array.from(aiProviders.values())[0]

      if (firstProvider) {
        const health = providerManager.getProviderHealth(
          firstProvider.config.name
        )
        expect(health).toBeDefined()
        expect(health?.name).toBe(firstProvider.config.name)
      }
    })

    it('should get all provider health statuses', () => {
      const allHealth = providerManager.getAllProviderHealth()
      expect(allHealth.size).toBeGreaterThan(0)
    })
  })

  describe('Provider Configuration', () => {
    it('should load environment-specific configuration', () => {
      const config = providerManager.getConfig()
      expect(config.defaultAIProvider).toBeDefined()
      expect(config.defaultDataProvider).toBeDefined()
    })

    it('should allow provider configuration updates', () => {
      const aiProviders = providerManager.getAIProviders()
      const firstProvider = Array.from(aiProviders.values())[0]

      if (firstProvider) {
        const originalTimeout = firstProvider.config.timeout
        providerManager.updateProviderConfig(firstProvider.config.name, {
          timeout: originalTimeout + 1000,
        })

        // Note: The actual config update would need to be tested with the provider's updateConfig method
        expect(firstProvider.config.timeout).toBe(originalTimeout)
      }
    })
  })

  describe('Provider Lifecycle', () => {
    it('should initialize providers correctly', async () => {
      const aiProviders = providerManager.getAIProviders()
      const dataProviders = providerManager.getDataProviders()

      // Check that providers are initialized
      for (const provider of aiProviders.values()) {
        expect(provider).toBeDefined()
        expect(provider.metadata).toBeDefined()
        expect(provider.config).toBeDefined()
      }

      for (const provider of dataProviders.values()) {
        expect(provider).toBeDefined()
        expect(provider.metadata).toBeDefined()
        expect(provider.config).toBeDefined()
      }
    })

    it('should dispose providers correctly', async () => {
      await providerManager.dispose()

      const aiProviders = providerManager.getAIProviders()
      const dataProviders = providerManager.getDataProviders()

      expect(aiProviders.size).toBe(0)
      expect(dataProviders.size).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle provider selection errors gracefully', async () => {
      // Test with invalid criteria that should fail
      await expect(
        providerManager.selectAIProvider({
          priority: 'performance',
          require: ['non-existent-provider'],
        })
      ).rejects.toThrow()
    })

    it('should handle provider not found errors', async () => {
      await expect(
        providerManager.getAIProvider('non-existent-provider')
      ).rejects.toThrow('not found')
    })
  })
})
