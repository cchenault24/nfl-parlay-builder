// ================================================================================================
// PROVIDER SYSTEM EXAMPLE - Demonstration of the unified provider system
// ================================================================================================

import { ProviderManager } from '../services/providers/ProviderManager'

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
    console.log('✅ Provider system initialized')
  }

  /**
   * Demonstrate AI provider selection with different criteria
   */
  async demonstrateAISelection(): Promise<void> {
    console.log('\n🤖 AI Provider Selection Examples:')

    try {
      // Select by performance
      const performanceProvider =
        await this.providerManager.selectAIProvider('performance')
      console.log(
        `Performance: ${performanceProvider.metadata.name} (${performanceProvider.metadata.version})`
      )

      // Select by cost
      const costProvider = await this.providerManager.selectAIProvider('cost')
      console.log(
        `Cost: ${costProvider.metadata.name} ($${costProvider.metadata.costPerRequest || 0}/request)`
      )

      // Select by reliability
      const reliabilityProvider =
        await this.providerManager.selectAIProvider('reliability')
      console.log(`Reliability: ${reliabilityProvider.metadata.name}`)

      // Select with custom criteria
      const customProvider = await this.providerManager.selectAIProvider({
        priority: 'performance',
        maxCost: 0.01,
        capabilities: ['chat_completion', 'json_mode'],
      })
      console.log(`Custom: ${customProvider.metadata.name}`)
    } catch (error) {
      console.error('❌ AI provider selection failed:', error)
    }
  }

  /**
   * Demonstrate data provider selection with different criteria
   */
  async demonstrateDataSelection(): Promise<void> {
    console.log('\n📊 Data Provider Selection Examples:')

    try {
      // Select by reliability
      const reliabilityProvider =
        await this.providerManager.selectDataProvider('reliability')
      console.log(
        `Reliability: ${reliabilityProvider.metadata.name} (${reliabilityProvider.metadata.dataQuality})`
      )

      // Select by performance
      const performanceProvider =
        await this.providerManager.selectDataProvider('performance')
      console.log(`Performance: ${performanceProvider.metadata.name}`)

      // Select with custom criteria
      const customProvider = await this.providerManager.selectDataProvider({
        priority: 'reliability',
        capabilities: ['nfl_games', 'team_rosters'],
      })
      console.log(`Custom: ${customProvider.metadata.name}`)
    } catch (error) {
      console.error('❌ Data provider selection failed:', error)
    }
  }

  /**
   * Demonstrate provider health monitoring
   */
  async demonstrateHealthMonitoring(): Promise<void> {
    console.log('\n🏥 Provider Health Monitoring:')

    const allHealth = this.providerManager.getAllProviderHealth()

    for (const [name, health] of allHealth) {
      const status = health.healthy ? '✅' : '❌'
      const responseTime = health.responseTime
        ? ` (${health.responseTime}ms)`
        : ''
      console.log(
        `${status} ${name}: ${health.healthy ? 'Healthy' : 'Unhealthy'}${responseTime}`
      )
    }
  }

  /**
   * Demonstrate provider capabilities
   */
  async demonstrateProviderCapabilities(): Promise<void> {
    console.log('\n🔧 Provider Capabilities:')

    // AI Providers
    const aiProviders = this.providerManager.getAIProviders()
    console.log('\nAI Providers:')
    for (const [name, provider] of aiProviders) {
      console.log(`  ${name}:`)
      console.log(`    Models: ${provider.metadata.supportedModels.join(', ')}`)
      console.log(
        `    Capabilities: ${provider.metadata.capabilities.join(', ')}`
      )
      console.log(`    Max Tokens: ${provider.metadata.maxTokens}`)
      console.log(`    Cost: $${provider.metadata.costPerRequest || 0}/request`)
    }

    // Data Providers
    const dataProviders = this.providerManager.getDataProviders()
    console.log('\nData Providers:')
    for (const [name, provider] of dataProviders) {
      console.log(`  ${name}:`)
      console.log(`    Quality: ${provider.metadata.dataQuality}`)
      console.log(`    Update Frequency: ${provider.metadata.updateFrequency}`)
      console.log(
        `    Capabilities: ${provider.metadata.capabilities.join(', ')}`
      )
      console.log(
        `    Endpoints: ${provider.metadata.supportedEndpoints.join(', ')}`
      )
    }
  }

  /**
   * Demonstrate configuration-driven loading
   */
  demonstrateConfiguration(): void {
    console.log('\n⚙️ Provider Configuration:')

    const config = this.providerManager.getConfig()
    console.log(`Default AI Provider: ${config.defaultAIProvider}`)
    console.log(`Default Data Provider: ${config.defaultDataProvider}`)
    console.log(`Auto Initialize: ${config.autoInitialize}`)
  }

  /**
   * Run all demonstrations
   */
  async runAllDemonstrations(): Promise<void> {
    console.log('🚀 Unified Provider System Demonstration')
    console.log('==========================================')

    await this.initialize()
    this.demonstrateConfiguration()
    await this.demonstrateAISelection()
    await this.demonstrateDataSelection()
    await this.demonstrateHealthMonitoring()
    await this.demonstrateProviderCapabilities()

    console.log('\n✅ All demonstrations completed!')
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.providerManager.dispose()
    console.log('🧹 Provider system cleaned up')
  }
}

// Example usage (uncomment to run)
/*
const example = new ProviderSystemExample()
example.runAllDemonstrations()
  .then(() => example.cleanup())
  .catch(console.error)
*/
