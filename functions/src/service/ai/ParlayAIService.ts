import {
  GameRosters,
  GeneratedParlay,
  NFLGame,
  StrategyConfig,
  VarietyFactors,
} from '../../types'
import { BaseParlayProvider, GenerationOptions } from './BaseParlayProvider'
import { ContextBuilder } from './ContextBuilder'

/**
 * Supported AI providers for parlay generation
 */
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'mock' | 'auto'

/**
 * Provider health status for monitoring
 */
export interface ProviderHealth {
  name: string
  healthy: boolean
  latency?: number
  lastError?: string
  lastChecked: Date
}

/**
 * Service configuration
 */
export interface ParlayAIServiceConfig {
  primaryProvider: AIProvider
  fallbackProviders: AIProvider[]
  maxRetries: number
  healthCheckInterval: number
  enableFallback: boolean
  debugMode: boolean
}

/**
 * Generation result with provider metadata
 */
export interface ParlayGenerationResult {
  parlay: GeneratedParlay
  metadata: {
    provider: string
    model: string
    tokens?: number
    latency: number
    confidence: number
    fallbackUsed: boolean
    attemptCount: number
  }
}

/**
 * Service for orchestrating AI-powered parlay generation across multiple providers
 * Handles provider selection, fallback logic, health monitoring, and context building
 */
export class ParlayAIService {
  private providers: Map<string, BaseParlayProvider>
  private providerHealth: Map<string, ProviderHealth>
  private config: ParlayAIServiceConfig
  private healthCheckTimer?: NodeJS.Timeout

  constructor(config: Partial<ParlayAIServiceConfig> = {}) {
    this.providers = new Map()
    this.providerHealth = new Map()
    this.config = {
      primaryProvider: 'openai',
      fallbackProviders: ['anthropic', 'google'],
      maxRetries: 3,
      healthCheckInterval: 5 * 60 * 1000, // 5 minutes
      enableFallback: true,
      debugMode: false,
      ...config,
    }

    this.startHealthMonitoring()
  }

  /**
   * MISSING METHOD: Get registered providers map
   */
  getRegisteredProviders(): Map<string, BaseParlayProvider> {
    return this.providers
  }

  /**
   * FIXED: Register an AI provider with proper health initialization
   */
  registerProvider(name: string, provider: BaseParlayProvider): void {
    this.providers.set(name, provider)

    // CRITICAL FIX: Set initial health to true instead of false
    this.providerHealth.set(name, {
      name,
      healthy: true, // Changed from false to true
      lastChecked: new Date(),
    })

    if (this.config.debugMode) {
      console.log(`Registered AI provider: ${name} (healthy: true)`)
    }
  }

  /**
   * Unregister an AI provider
   */
  unregisterProvider(name: string): void {
    this.providers.delete(name)
    this.providerHealth.delete(name)

    if (this.config.debugMode) {
      console.log(`Unregistered AI provider: ${name}`)
    }
  }

  /**
   * UPDATED: Enhanced generateParlay with better error handling and debugging
   */
  async generateParlay(
    game: NFLGame,
    rosters: GameRosters,
    strategy: StrategyConfig,
    varietyFactors: VarietyFactors,
    options: GenerationOptions = {}
  ): Promise<ParlayGenerationResult> {
    const startTime = Date.now()
    let lastError: any
    let attemptCount = 0
    let fallbackUsed = false

    console.log('DEBUG: ParlayAIService.generateParlay started')
    console.log('DEBUG: Options:', JSON.stringify(options, null, 2))

    // Build rich context for AI generation
    const context = ContextBuilder.buildContext(
      game,
      rosters,
      strategy,
      varietyFactors
    )

    // Apply generation options
    if (options.temperature !== undefined) {
      context.temperature = options.temperature
    }

    // Determine provider order
    const providerOrder = this.getProviderOrder(options.provider)
    console.log('DEBUG: Final provider order for generation:', providerOrder)

    if (providerOrder.length === 0) {
      const registeredProviders = Array.from(this.providers.keys())
      throw new Error(
        `No suitable providers available. Requested: ${options.provider}, Registered: [${registeredProviders.join(', ')}]`
      )
    }

    if (this.config.debugMode) {
      console.log('Provider order for generation:', providerOrder)
      console.log('Generation context temperature:', context.temperature)
    }

    // Try each provider in order
    for (const providerName of providerOrder) {
      const provider = this.providers.get(providerName)

      if (!provider) {
        console.warn(`Provider ${providerName} not registered, skipping`)
        continue
      }

      // Check provider health but continue anyway for debugging
      const health = this.providerHealth.get(providerName)
      if (health && !health.healthy) {
        console.warn(
          `Provider ${providerName} marked unhealthy (${health.lastError}), but attempting anyway for debugging`
        )
      }

      attemptCount++
      if (attemptCount > 1) {
        fallbackUsed = true
      }

      try {
        console.log(
          `DEBUG: Attempting generation with provider: ${providerName}`
        )
        console.log(`DEBUG: Provider instance:`, provider.constructor.name)

        const response = await provider.generateParlay(game, rosters, context)
        const totalLatency = Date.now() - startTime

        // Update provider health on success
        this.updateProviderHealth(providerName, true, response.metadata.latency)

        console.log(`DEBUG: Generation successful with ${providerName}:`, {
          latency: totalLatency,
          confidence: response.metadata.confidence,
          attempts: attemptCount,
        })

        return {
          parlay: response.parlay,
          metadata: {
            ...response.metadata,
            fallbackUsed,
            attemptCount,
          },
        }
      } catch (error) {
        lastError = error
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'

        console.error(`ERROR: Provider ${providerName} failed:`, {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          attempt: attemptCount,
        })

        // Update provider health on failure
        this.updateProviderHealth(providerName, false, undefined, errorMessage)

        // If this was the only requested provider and fallback is disabled, throw immediately
        if (
          !this.config.enableFallback &&
          options.provider &&
          options.provider !== 'auto' &&
          providerName === options.provider
        ) {
          console.error(
            'Requested provider failed and fallback disabled, throwing error'
          )
          throw error
        }

        // Continue to next provider
        continue
      }
    }

    // All providers failed
    const totalLatency = Date.now() - startTime
    const registeredProviders = Array.from(this.providers.keys())

    console.error('ERROR: All providers failed:', {
      attemptCount,
      totalLatency,
      lastError: lastError?.message,
      providerOrder,
      registeredProviders,
      requestedProvider: options.provider,
    })

    throw new Error(
      `All AI providers failed after ${attemptCount} attempts. Provider order: [${providerOrder.join(', ')}]. Last error: ${
        lastError?.message || 'Unknown error'
      }`
    )
  }

  /**
   * Get current health status of all providers
   */
  getProviderHealth(): ProviderHealth[] {
    return Array.from(this.providerHealth.values())
  }

  /**
   * Get detailed service status
   */
  getServiceStatus(): {
    healthy: boolean
    totalProviders: number
    healthyProviders: number
    primaryProviderHealthy: boolean
    config: ParlayAIServiceConfig
  } {
    const allHealth = this.getProviderHealth()
    const healthyProviders = allHealth.filter(h => h.healthy)
    const primaryHealth = this.providerHealth.get(this.config.primaryProvider)

    return {
      healthy: healthyProviders.length > 0,
      totalProviders: allHealth.length,
      healthyProviders: healthyProviders.length,
      primaryProviderHealthy: primaryHealth?.healthy ?? false,
      config: this.config,
    }
  }

  /**
   * Manually trigger health checks for all providers
   */
  async checkAllProviderHealth(): Promise<void> {
    const healthPromises = Array.from(this.providers.entries()).map(
      async ([name, provider]) => {
        try {
          const startTime = Date.now()
          const isHealthy = await provider.validateConnection()
          const latency = Date.now() - startTime

          this.updateProviderHealth(name, isHealthy, latency)
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Health check failed'
          this.updateProviderHealth(name, false, undefined, errorMessage)
        }
      }
    )

    await Promise.allSettled(healthPromises)
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ParlayAIServiceConfig>): void {
    this.config = { ...this.config, ...newConfig }

    if (this.config.debugMode) {
      console.log('Updated ParlayAIService config:', this.config)
    }

    // Restart health monitoring if interval changed
    if (newConfig.healthCheckInterval !== undefined) {
      this.stopHealthMonitoring()
      this.startHealthMonitoring()
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopHealthMonitoring()
    this.providers.clear()
    this.providerHealth.clear()

    if (this.config.debugMode) {
      console.log('ParlayAIService destroyed')
    }
  }

  /**
   * UPDATED: Determine the order of providers to try with better debugging
   */
  private getProviderOrder(requestedProvider?: string): string[] {
    console.log('DEBUG: getProviderOrder called with:', requestedProvider)

    if (requestedProvider && requestedProvider !== 'auto') {
      // Use only the requested provider
      const providerOrder = [requestedProvider]
      console.log('DEBUG: Using requested provider only:', providerOrder)

      const filteredOrder = providerOrder.filter(name => {
        const hasProvider = this.providers.has(name)
        console.log(`DEBUG: Provider ${name} registered: ${hasProvider}`)
        return hasProvider
      })

      console.log('DEBUG: Filtered requested provider order:', filteredOrder)
      return filteredOrder
    }

    // Start with primary, then fallbacks
    const order = [
      this.config.primaryProvider,
      ...this.config.fallbackProviders,
    ]
    console.log('DEBUG: Default provider order:', order)

    // Remove duplicates and filter to only registered providers
    const uniqueOrder = Array.from(new Set(order))
    const filteredOrder = uniqueOrder.filter(name => {
      const hasProvider = this.providers.has(name)
      console.log(`DEBUG: Provider ${name} registered: ${hasProvider}`)
      return hasProvider
    })

    console.log('DEBUG: Final filtered provider order:', filteredOrder)
    return filteredOrder
  }

  /**
   * UPDATED: Make updateProviderHealth public (was private)
   */
  updateProviderHealth(
    name: string,
    healthy: boolean,
    latency?: number,
    error?: string
  ): void {
    const current = this.providerHealth.get(name)
    if (!current) {
      console.warn(
        `Attempted to update health for unregistered provider: ${name}`
      )
      return
    }

    this.providerHealth.set(name, {
      ...current,
      healthy,
      latency,
      lastError: error,
      lastChecked: new Date(),
    })

    if (this.config.debugMode) {
      console.log(`Provider ${name} health updated:`, {
        healthy,
        latency,
        error,
        wasHealthy: current.healthy,
      })
    }
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }

    this.healthCheckTimer = setInterval(() => {
      this.checkAllProviderHealth().catch(error => {
        if (this.config.debugMode) {
          console.error('Health monitoring error:', error)
        }
      })
    }, this.config.healthCheckInterval)

    // Run initial health check
    setTimeout(() => {
      this.checkAllProviderHealth()
    }, 1000)
  }

  /**
   * Stop health monitoring
   */
  private stopHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = undefined
    }
  }
}

export default ParlayAIService
