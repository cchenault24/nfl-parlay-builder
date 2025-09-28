// ================================================================================================
// PROVIDER REGISTRY TYPES - Provider management and health monitoring
// ================================================================================================

import { IProvider, ProviderError, ProviderHealth } from './base'

/**
 * Provider registry configuration
 */
export interface ProviderRegistryConfig {
  enableHealthMonitoring: boolean
  healthCheckInterval: number
  maxRetries: number
  fallbackEnabled: boolean
  autoFailover: boolean
}

/**
 * Provider registration info
 */
export interface ProviderRegistration<T extends IProvider> {
  provider: T
  name: string
  type: 'ai' | 'data'
  priority: number
  enabled: boolean
  health: ProviderHealth
  lastUsed?: Date
  usageCount: number
}

/**
 * Provider selection criteria
 */
export interface ProviderSelectionCriteria {
  type: 'ai' | 'data'
  priority?: 'cost' | 'performance' | 'reliability'
  exclude?: string[]
  require?: string[]
  fallback?: boolean
}

/**
 * Provider selection result
 */
export interface ProviderSelectionResult<T extends IProvider> {
  provider: T
  name: string
  reason: string
  fallback?: boolean
}

/**
 * Provider registry interface for managing providers
 */
export interface IProviderRegistry {
  /**
   * Register a provider
   */
  register<T extends IProvider>(
    name: string,
    provider: T,
    type: 'ai' | 'data',
    priority?: number
  ): void

  /**
   * Unregister a provider
   */
  unregister(name: string): boolean

  /**
   * Get a provider by name
   */
  get<T extends IProvider>(name: string): T | undefined

  /**
   * Get all providers of a specific type
   */
  getByType<T extends IProvider>(type: 'ai' | 'data'): Map<string, T>

  /**
   * Select the best provider based on criteria
   */
  selectProvider<T extends IProvider>(
    criteria: ProviderSelectionCriteria
  ): Promise<ProviderSelectionResult<T> | null>

  /**
   * Get provider health status
   */
  getProviderHealth(name: string): ProviderHealth | undefined

  /**
   * Get all provider health statuses
   */
  getAllProviderHealth(): Map<string, ProviderHealth>

  /**
   * Update provider health
   */
  updateProviderHealth(
    name: string,
    healthy: boolean,
    responseTime?: number,
    error?: string
  ): void

  /**
   * Enable/disable a provider
   */
  setProviderEnabled(name: string, enabled: boolean): void

  /**
   * Get provider usage statistics
   */
  getProviderStats(name: string):
    | {
        usageCount: number
        lastUsed?: Date
        averageResponseTime?: number
        successRate?: number
      }
    | undefined

  /**
   * Get registry configuration
   */
  getConfig(): ProviderRegistryConfig

  /**
   * Update registry configuration
   */
  updateConfig(config: Partial<ProviderRegistryConfig>): void

  /**
   * Start health monitoring
   */
  startHealthMonitoring(): void

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void

  /**
   * Get all registered providers
   */
  getAllProviders(): Map<string, ProviderRegistration<IProvider>>

  /**
   * Clear all providers
   */
  clear(): void
}

/**
 * Provider registry error
 */
export class ProviderRegistryError extends ProviderError {
  constructor(message: string, provider: string, code?: string) {
    super(message, provider, code, false)
    this.name = 'ProviderRegistryError'
  }
}

/**
 * Provider not registered error
 */
export class ProviderNotRegisteredError extends ProviderRegistryError {
  constructor(provider: string) {
    super(
      `Provider '${provider}' is not registered`,
      provider,
      'NOT_REGISTERED'
    )
    this.name = 'ProviderNotRegisteredError'
  }
}

/**
 * Provider selection error
 */
export class ProviderSelectionError extends ProviderRegistryError {
  constructor(message: string, criteria: ProviderSelectionCriteria) {
    super(
      `Provider selection failed: ${message}`,
      'registry',
      'SELECTION_FAILED'
    )
    this.name = 'ProviderSelectionError'
  }
}
