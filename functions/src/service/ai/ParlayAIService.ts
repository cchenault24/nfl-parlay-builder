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
   * Register an AI provider
   */
  registerProvider(name: string, provider: BaseParlayProvider): void {
    this.providers.set(name, provider)
    this.providerHealth.set(name, {
      name,
      healthy: false,
      lastChecked: new Date(),
    })

    if (this.config.debugMode) {
      console.log(`Registered AI provider: ${name}`)
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
   * Main method to generate a parlay using the best available provider
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

    if (this.config.debugMode) {
      console.log('Provider order for generation:', providerOrder)
      console.log('Generation context:', context)
    }

    // Try each provider in order
    for (const providerName of providerOrder) {
      const provider = this.providers.get(providerName)

      if (!provider) {
        if (this.config.debugMode) {
          console.warn(`Provider ${providerName} not registered, skipping`)
        }
        continue
      }

      // Check provider health
      const health = this.providerHealth.get(providerName)
      if (health && !health.healthy) {
        if (this.config.debugMode) {
          console.warn(`Provider ${providerName} unhealthy, skipping`)
        }
        continue
      }

      attemptCount++
      if (attemptCount > 1) {
        fallbackUsed = true
      }

      try {
        if (this.config.debugMode) {
          console.log(`Attempting generation with provider: ${providerName}`)
        }

        const response = await provider.generateParlay(game, rosters, context)
        const totalLatency = Date.now() - startTime

        // Update provider health
        this.updateProviderHealth(providerName, true, response.metadata.latency)

        if (this.config.debugMode) {
          console.log(`Generation successful with ${providerName}:`, {
            latency: totalLatency,
            confidence: response.metadata.confidence,
            attempts: attemptCount,
          })
        }

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

        // Update provider health
        this.updateProviderHealth(providerName, false, undefined, errorMessage)

        if (this.config.debugMode) {
          console.warn(`Provider ${providerName} failed:`, errorMessage)
        }

        // If this was the primary provider and fallback is disabled, throw immediately
        if (
          !this.config.enableFallback &&
          providerName === this.config.primaryProvider
        ) {
          throw error
        }

        // Continue to next provider
        continue
      }
    }

    // All providers failed
    const totalLatency = Date.now() - startTime

    if (this.config.debugMode) {
      console.error('All providers failed:', {
        attemptCount,
        totalLatency,
        lastError: lastError?.message,
      })
    }

    throw new Error(
      `All AI providers failed after ${attemptCount} attempts. Last error: ${
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
   * Determine the order of providers to try
   */
  private getProviderOrder(requestedProvider?: string): string[] {
    if (requestedProvider && requestedProvider !== 'auto') {
      return [requestedProvider]
    }

    // Start with primary, then fallbacks
    const order = [this.config.primaryProvider]

    // Add fallbacks if enabled
    if (this.config.enableFallback) {
      this.config.fallbackProviders.forEach(provider => {
        if (!order.includes(provider)) {
          order.push(provider)
        }
      })
    }

    // Filter to only registered providers
    return order.filter(name => this.providers.has(name))
  }

  /**
   * Update provider health status
   */
  private updateProviderHealth(
    name: string,
    healthy: boolean,
    latency?: number,
    error?: string
  ): void {
    const current = this.providerHealth.get(name)
    if (!current) return

    this.providerHealth.set(name, {
      ...current,
      healthy,
      latency,
      lastError: error,
      lastChecked: new Date(),
    })
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
