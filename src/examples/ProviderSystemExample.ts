// ================================================================================================
// PROVIDER SYSTEM EXAMPLE - Demonstration of the unified provider system
// ================================================================================================

import { ProviderManager } from '../services/providers/ProviderManager'
import { logger } from '../utils/logger'

/**
 * Example demonstrating the unified provider system
 */
export class ProviderSystemExample {
  private providerManager: ProviderManager

  constructor() {
    this.providerManager = new ProviderManager()
  }

  /**
   * Initialize the provider system
   */
  async initialize(): Promise<void> {
    await this.providerManager.initialize()
    logger.info('Provider system initialized', {
      component: 'ProviderSystemExample',
    })
  }

  /**
   * Demonstrate AI provider selection with different criteria
   */
  async demonstrateAISelection(): Promise<void> {
    logger.info('AI Provider Selection Examples', {
      component: 'ProviderSystemExample',
    })

    try {
      // Select by performance
      const performanceProvider =
        await this.providerManager.selectAIProvider('performance')
      logger.info(
        `Performance: ${performanceProvider.metadata.name} (${performanceProvider.metadata.version})`,
        { component: 'ProviderSystemExample', action: 'selectAIProvider' }
      )

      // Select by cost
      const costProvider = await this.providerManager.selectAIProvider('cost')
      logger.info(
        `Cost: ${costProvider.metadata.name} ($${costProvider.metadata.costPerRequest || 0}/request)`,
        { component: 'ProviderSystemExample', action: 'selectAIProvider' }
      )

      // Select by reliability
      const reliabilityProvider =
        await this.providerManager.selectAIProvider('reliability')
      logger.info(`Reliability: ${reliabilityProvider.metadata.name}`, {
        component: 'ProviderSystemExample',
        action: 'selectAIProvider',
      })

      // Select with custom criteria
      const customProvider = await this.providerManager.selectAIProvider({
        priority: 'performance',
        maxCost: 0.01,
        capabilities: ['chat_completion', 'json_mode'],
      })
      logger.info(`Custom: ${customProvider.metadata.name}`)
    } catch (error) {
      console.error('❌ AI provider selection failed:', error)
    }
  }

  /**
   * Demonstrate data provider selection with different criteria
   */
  async demonstrateDataSelection(): Promise<void> {
    logger.info('\n📊 Data Provider Selection Examples:')

    try {
      // Select by reliability
      const reliabilityProvider =
        await this.providerManager.selectDataProvider('reliability')
      logger.info(
        `Reliability: ${reliabilityProvider.metadata.name} (${reliabilityProvider.metadata.dataQuality})`
      )

      // Select by performance
      const performanceProvider =
        await this.providerManager.selectDataProvider('performance')
      logger.info(`Performance: ${performanceProvider.metadata.name}`)

      // Select with custom criteria
      const customProvider = await this.providerManager.selectDataProvider({
        priority: 'reliability',
        capabilities: ['nfl_games', 'team_rosters'],
      })
      logger.info(`Custom: ${customProvider.metadata.name}`)
    } catch (error) {
      console.error('❌ Data provider selection failed:', error)
    }
  }

  /**
   * Demonstrate provider health monitoring
   */
  async demonstrateHealthMonitoring(): Promise<void> {
    logger.info('\n🏥 Provider Health Monitoring:')

    const allHealth = this.providerManager.getAllProviderHealth()

    for (const [name, health] of allHealth) {
      const status = health.healthy ? '✅' : '❌'
      const responseTime = health.responseTime
        ? ` (${health.responseTime}ms)`
        : ''
      logger.info(
        `${status} ${name}: ${health.healthy ? 'Healthy' : 'Unhealthy'}${responseTime}`
      )
    }
  }

  /**
   * Demonstrate provider capabilities
   */
  async demonstrateProviderCapabilities(): Promise<void> {
    logger.info('\n🔧 Provider Capabilities:')

    // AI Providers
    const aiProviders = this.providerManager.getAIProviders()
    logger.info('\nAI Providers:')
    for (const [name, provider] of aiProviders) {
      logger.info(`  ${name}:`)
      logger.info(`    Models: ${provider.metadata.supportedModels.join(', ')}`)
      logger.info(
        `    Capabilities: ${provider.metadata.capabilities.join(', ')}`
      )
      logger.info(`    Max Tokens: ${provider.metadata.maxTokens}`)
      logger.info(`    Cost: $${provider.metadata.costPerRequest || 0}/request`)
    }

    // Data Providers
    const dataProviders = this.providerManager.getDataProviders()
    logger.info('\nData Providers:')
    for (const [name, provider] of dataProviders) {
      logger.info(`  ${name}:`)
      logger.info(`    Quality: ${provider.metadata.dataQuality}`)
      logger.info(`    Update Frequency: ${provider.metadata.updateFrequency}`)
      logger.info(
        `    Capabilities: ${provider.metadata.capabilities.join(', ')}`
      )
      logger.info(
        `    Endpoints: ${provider.metadata.supportedEndpoints.join(', ')}`
      )
    }
  }

  /**
   * Demonstrate configuration-driven loading
   */
  demonstrateConfiguration(): void {
    logger.info('\n⚙️ Provider Configuration:')

    const config = this.providerManager.getConfig()
    logger.info(`Default AI Provider: ${config.defaultAIProvider}`)
    logger.info(`Default Data Provider: ${config.defaultDataProvider}`)
    logger.info(`Auto Initialize: ${config.autoInitialize}`)
  }

  /**
   * Run all demonstrations
   */
  async runAllDemonstrations(): Promise<void> {
    logger.info('🚀 Unified Provider System Demonstration')
    logger.info('==========================================')

    await this.initialize()
    this.demonstrateConfiguration()
    await this.demonstrateAISelection()
    await this.demonstrateDataSelection()
    await this.demonstrateHealthMonitoring()
    await this.demonstrateProviderCapabilities()

    logger.info('\n✅ All demonstrations completed!')
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.providerManager.dispose()
    logger.info('🧹 Provider system cleaned up')
  }
}

// Example usage (uncomment to run)
/*
const example = new ProviderSystemExample()
example.runAllDemonstrations()
  .then(() => example.cleanup())
  .catch(console.error)
*/
