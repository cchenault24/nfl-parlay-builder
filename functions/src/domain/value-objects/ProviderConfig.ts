/**
 * ProviderConfig value object
 * Represents provider configuration with validation and business logic
 */
export class ProviderConfig {
  public readonly name: string
  public readonly enabled: boolean
  public readonly priority: number
  public readonly timeout: number
  public readonly retries: number
  public readonly apiKey?: string
  public readonly model?: string
  public readonly maxTokens?: number
  public readonly temperature?: number
  public readonly costPerToken?: number
  public readonly rateLimitPerMinute?: number
  public readonly rateLimitPerDay?: number

  constructor(
    name: string,
    enabled: boolean,
    priority: number,
    timeout: number,
    retries: number,
    apiKey?: string,
    model?: string,
    maxTokens?: number,
    temperature?: number,
    costPerToken?: number,
    rateLimitPerMinute?: number,
    rateLimitPerDay?: number
  ) {
    this.name = this.validateName(name)
    this.enabled = enabled
    this.priority = this.validatePriority(priority)
    this.timeout = this.validateTimeout(timeout)
    this.retries = this.validateRetries(retries)
    this.apiKey = apiKey
    this.model = model
    this.maxTokens = maxTokens
    this.temperature = temperature
    this.costPerToken = costPerToken
    this.rateLimitPerMinute = rateLimitPerMinute
    this.rateLimitPerDay = rateLimitPerDay
  }

  /**
   * Validate provider name
   */
  private validateName(name: string): string {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Provider name is required')
    }
    return name.trim()
  }

  /**
   * Validate priority
   */
  private validatePriority(priority: number): number {
    if (typeof priority !== 'number' || priority < 1 || priority > 10) {
      throw new Error('Priority must be a number between 1 and 10')
    }
    return priority
  }

  /**
   * Validate timeout
   */
  private validateTimeout(timeout: number): number {
    if (typeof timeout !== 'number' || timeout < 1000 || timeout > 300000) {
      throw new Error('Timeout must be between 1000ms and 300000ms')
    }
    return timeout
  }

  /**
   * Validate retries
   */
  private validateRetries(retries: number): number {
    if (typeof retries !== 'number' || retries < 0 || retries > 10) {
      throw new Error('Retries must be between 0 and 10')
    }
    return retries
  }

  /**
   * Check if provider is available
   */
  public isAvailable(): boolean {
    return this.enabled && !!this.apiKey
  }

  /**
   * Check if provider has rate limits
   */
  public hasRateLimits(): boolean {
    return !!(this.rateLimitPerMinute || this.rateLimitPerDay)
  }

  /**
   * Get effective timeout in milliseconds
   */
  public getEffectiveTimeout(): number {
    return this.timeout
  }

  /**
   * Get cost for a given number of tokens
   */
  public getCostForTokens(tokenCount: number): number {
    if (!this.costPerToken) return 0
    return tokenCount * this.costPerToken
  }

  /**
   * Check if provider supports a specific model
   */
  public supportsModel(model: string): boolean {
    return !this.model || this.model === model
  }

  /**
   * Get provider health score (0-1)
   */
  public getHealthScore(): number {
    let score = 0.5 // Base score

    // Enablement bonus
    if (this.enabled) score += 0.2

    // API key bonus
    if (this.apiKey) score += 0.2

    // Priority bonus (higher priority = higher score)
    score += (this.priority / 10) * 0.1

    return Math.min(1, score)
  }

  /**
   * Get provider summary
   */
  public getSummary(): {
    name: string
    enabled: boolean
    priority: number
    healthScore: number
    hasApiKey: boolean
    hasRateLimits: boolean
    costPerToken?: number
  } {
    return {
      name: this.name,
      enabled: this.enabled,
      priority: this.priority,
      healthScore: this.getHealthScore(),
      hasApiKey: !!this.apiKey,
      hasRateLimits: this.hasRateLimits(),
      costPerToken: this.costPerToken,
    }
  }

  /**
   * Create a copy with updated enabled status
   */
  public withEnabled(enabled: boolean): ProviderConfig {
    return new ProviderConfig(
      this.name,
      enabled,
      this.priority,
      this.timeout,
      this.retries,
      this.apiKey,
      this.model,
      this.maxTokens,
      this.temperature,
      this.costPerToken,
      this.rateLimitPerMinute,
      this.rateLimitPerDay
    )
  }

  /**
   * Create a copy with updated priority
   */
  public withPriority(priority: number): ProviderConfig {
    return new ProviderConfig(
      this.name,
      this.enabled,
      priority,
      this.timeout,
      this.retries,
      this.apiKey,
      this.model,
      this.maxTokens,
      this.temperature,
      this.costPerToken,
      this.rateLimitPerMinute,
      this.rateLimitPerDay
    )
  }

  /**
   * Create a copy with updated API key
   */
  public withApiKey(apiKey: string): ProviderConfig {
    return new ProviderConfig(
      this.name,
      this.enabled,
      this.priority,
      this.timeout,
      this.retries,
      apiKey,
      this.model,
      this.maxTokens,
      this.temperature,
      this.costPerToken,
      this.rateLimitPerMinute,
      this.rateLimitPerDay
    )
  }

  /**
   * Create a copy with updated model
   */
  public withModel(model: string): ProviderConfig {
    return new ProviderConfig(
      this.name,
      this.enabled,
      this.priority,
      this.timeout,
      this.retries,
      this.apiKey,
      model,
      this.maxTokens,
      this.temperature,
      this.costPerToken,
      this.rateLimitPerMinute,
      this.rateLimitPerDay
    )
  }
}
