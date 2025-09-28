// ================================================================================================
// BASE PROVIDER INTERFACES - Core provider abstraction
// ================================================================================================

/**
 * Provider health status for monitoring
 */
export interface ProviderHealth {
  name: string
  healthy: boolean
  lastChecked: Date
  lastError?: string
  responseTime?: number
  uptime: number
}

/**
 * Provider configuration base interface
 */
export interface ProviderConfig {
  name: string
  enabled: boolean
  priority: number
  timeout: number
  retries: number
  fallback?: string[]
}

/**
 * Provider metadata for identification and capabilities
 */
export interface ProviderMetadata {
  name: string
  version: string
  type: 'ai' | 'data'
  capabilities: string[]
  costPerRequest?: number
  rateLimit?: {
    requestsPerMinute: number
    requestsPerHour: number
  }
}

/**
 * Criteria for selecting the best provider
 */
export interface ProviderSelectionCriteria {
  type: 'ai' | 'data'
  priority?: 'cost' | 'performance' | 'reliability' | 'balanced'
  exclude?: string[]
  require?: string[]
  fallback?: boolean
  maxCost?: number
  minSuccessRate?: number
  maxResponseTime?: number
  preferredModels?: string[]
  capabilities?: string[]
  // Legacy support for numeric weights
  performance?: number // 0-1 weight for performance
  reliability?: number // 0-1 weight for reliability
  cost?: number // 0-1 weight for cost efficiency
  latency?: number // 0-1 weight for low latency
  availability?: number // 0-1 weight for availability
  customWeights?: Record<string, number> // Custom criteria weights
}

/**
 * Base provider interface that all providers must implement
 */
export interface IProvider {
  /**
   * Provider metadata
   */
  readonly metadata: ProviderMetadata

  /**
   * Provider configuration
   */
  readonly config: ProviderConfig

  /**
   * Initialize the provider
   */
  initialize(): Promise<void>

  /**
   * Validate provider connection and configuration
   */
  validateConnection(): Promise<boolean>

  /**
   * Get current provider health status
   */
  getHealth(): ProviderHealth

  /**
   * Update provider configuration
   */
  updateConfig(config: Partial<ProviderConfig>): void

  /**
   * Cleanup resources
   */
  dispose(): Promise<void>
}

/**
 * Provider error types for specific error handling
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code?: string,
    public readonly retryable: boolean = true
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}

export class ProviderUnavailableError extends ProviderError {
  constructor(provider: string, message: string = 'Provider is unavailable') {
    super(message, provider, 'UNAVAILABLE', false)
    this.name = 'ProviderUnavailableError'
  }
}

export class ProviderRateLimitError extends ProviderError {
  constructor(provider: string) {
    super(
      `Rate limit exceeded for provider ${provider}`,
      provider,
      'RATE_LIMIT',
      true
    )
    this.name = 'ProviderRateLimitError'
  }
}

export class ProviderConfigurationError extends ProviderError {
  constructor(provider: string, message: string) {
    super(message, provider, 'CONFIGURATION', false)
    this.name = 'ProviderConfigurationError'
  }
}
