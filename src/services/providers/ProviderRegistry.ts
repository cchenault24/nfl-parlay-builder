// ================================================================================================
// PROVIDER REGISTRY - Provider management and health monitoring
// ================================================================================================

import {
  IProvider,
  IProviderRegistry,
  ProviderHealth,
  ProviderNotRegisteredError,
  ProviderRegistration,
  ProviderRegistryConfig,
  ProviderSelectionCriteria,
  ProviderSelectionError,
  ProviderSelectionResult,
} from '../../types/providers'

/**
 * Provider registry implementation for managing and monitoring providers
 */
export class ProviderRegistry implements IProviderRegistry {
  private config: ProviderRegistryConfig
  private providers: Map<string, ProviderRegistration<IProvider>>
  private healthCheckTimer?: NodeJS.Timeout

  constructor(config: Partial<ProviderRegistryConfig> = {}) {
    this.config = {
      enableHealthMonitoring: true,
      healthCheckInterval: 5 * 60 * 1000, // 5 minutes
      maxRetries: 3,
      fallbackEnabled: true,
      autoFailover: true,
      ...config,
    }

    this.providers = new Map()

    if (this.config.enableHealthMonitoring) {
      this.startHealthMonitoring()
    }
  }

  /**
   * Register a provider
   */
  register<T extends IProvider>(
    name: string,
    provider: T,
    type: 'ai' | 'data',
    priority: number = 1
  ): void {
    const registration: ProviderRegistration<T> = {
      provider,
      name,
      type,
      priority,
      enabled: true,
      health: {
        name,
        healthy: true,
        lastChecked: new Date(),
        uptime: 0,
      },
      usageCount: 0,
    }

    this.providers.set(name, registration as ProviderRegistration<IProvider>)
  }

  /**
   * Unregister a provider
   */
  unregister(name: string): boolean {
    const registration = this.providers.get(name)
    if (registration) {
      // Dispose of the provider
      registration.provider.dispose().catch(console.error)
      return this.providers.delete(name)
    }
    return false
  }

  /**
   * Get a provider by name
   */
  get<T extends IProvider>(name: string): T | undefined {
    const registration = this.providers.get(name)
    if (!registration || !registration.enabled) {
      return undefined
    }
    return registration.provider as T
  }

  /**
   * Get all providers of a specific type
   */
  getByType<T extends IProvider>(type: 'ai' | 'data'): Map<string, T> {
    const result = new Map<string, T>()

    for (const [name, registration] of this.providers) {
      if (registration.type === type && registration.enabled) {
        result.set(name, registration.provider as T)
      }
    }

    return result
  }

  /**
   * Select the best provider based on criteria
   */
  async selectProvider<T extends IProvider>(
    criteria: ProviderSelectionCriteria
  ): Promise<ProviderSelectionResult<T> | null> {
    const candidates = this.getCandidatesByType<T>(criteria.type)

    if (candidates.length === 0) {
      throw new ProviderSelectionError(
        `No ${criteria.type} providers available`,
        criteria
      )
    }

    // Filter by requirements and exclusions
    const filtered = candidates.filter(candidate => {
      if (criteria.exclude?.includes(candidate.name)) {
        return false
      }
      if (
        criteria.require?.length &&
        !criteria.require.includes(candidate.name)
      ) {
        return false
      }
      return candidate.enabled && candidate.health.healthy
    })

    if (filtered.length === 0) {
      if (criteria.fallback) {
        // Try with unhealthy providers as fallback
        const fallbackCandidates = candidates.filter(candidate => {
          if (criteria.exclude?.includes(candidate.name)) {
            return false
          }
          if (
            criteria.require?.length &&
            !criteria.require.includes(candidate.name)
          ) {
            return false
          }
          return candidate.enabled
        })

        if (fallbackCandidates.length > 0) {
          const selected = this.selectBestProvider(fallbackCandidates, criteria)
          return {
            provider: selected.provider as T,
            name: selected.name,
            reason: 'Fallback to unhealthy provider',
            fallback: true,
          }
        }
      }

      throw new ProviderSelectionError(
        `No healthy ${criteria.type} providers available`,
        criteria
      )
    }

    const selected = this.selectBestProvider(filtered, criteria)
    return {
      provider: selected.provider as T,
      name: selected.name,
      reason: selected.reason,
    }
  }

  /**
   * Get provider health status
   */
  getProviderHealth(name: string): ProviderHealth | undefined {
    return this.providers.get(name)?.health
  }

  /**
   * Get all provider health statuses
   */
  getAllProviderHealth(): Map<string, ProviderHealth> {
    const result = new Map<string, ProviderHealth>()

    for (const [name, registration] of this.providers) {
      result.set(name, registration.health)
    }

    return result
  }

  /**
   * Update provider health
   */
  updateProviderHealth(
    name: string,
    healthy: boolean,
    responseTime?: number,
    error?: string
  ): void {
    const registration = this.providers.get(name)
    if (!registration) {
      throw new ProviderNotRegisteredError(name)
    }

    registration.health = {
      ...registration.health,
      healthy,
      lastChecked: new Date(),
      responseTime,
      lastError: error,
    }
  }

  /**
   * Enable/disable a provider
   */
  setProviderEnabled(name: string, enabled: boolean): void {
    const registration = this.providers.get(name)
    if (!registration) {
      throw new ProviderNotRegisteredError(name)
    }

    registration.enabled = enabled
  }

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
    | undefined {
    const registration = this.providers.get(name)
    if (!registration) {
      return undefined
    }

    return {
      usageCount: registration.usageCount,
      lastUsed: registration.lastUsed,
      averageResponseTime: registration.health.responseTime,
      successRate: registration.health.healthy ? 1 : 0, // Simplified for now
    }
  }

  /**
   * Get registry configuration
   */
  getConfig(): ProviderRegistryConfig {
    return { ...this.config }
  }

  /**
   * Update registry configuration
   */
  updateConfig(config: Partial<ProviderRegistryConfig>): void {
    this.config = { ...this.config, ...config }

    // Restart health monitoring if interval changed
    if (config.healthCheckInterval && this.healthCheckTimer) {
      this.stopHealthMonitoring()
      this.startHealthMonitoring()
    }
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks()
    }, this.config.healthCheckInterval)
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = undefined
    }
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): Map<string, ProviderRegistration<IProvider>> {
    return new Map(this.providers)
  }

  /**
   * Clear all providers
   */
  clear(): void {
    this.stopHealthMonitoring()

    for (const [, registration] of this.providers) {
      registration.provider.dispose().catch(console.error)
    }

    this.providers.clear()
  }

  // ===== PRIVATE METHODS =====

  /**
   * Get candidates by type
   */
  private getCandidatesByType<T extends IProvider>(
    type: 'ai' | 'data'
  ): ProviderRegistration<T>[] {
    const candidates: ProviderRegistration<T>[] = []

    for (const registration of this.providers.values()) {
      if (registration.type === type) {
        candidates.push(registration as ProviderRegistration<T>)
      }
    }

    return candidates
  }

  /**
   * Select the best provider based on criteria
   */
  private selectBestProvider<T extends IProvider>(
    candidates: ProviderRegistration<T>[],
    criteria: ProviderSelectionCriteria
  ): { provider: T; name: string; reason: string } {
    // Filter candidates based on criteria
    const filtered = this.filterCandidatesByCriteria(candidates, criteria)

    if (filtered.length === 0) {
      throw new ProviderSelectionError(
        `No providers match the selection criteria`,
        criteria
      )
    }

    // Score and sort candidates
    const scored = filtered.map(candidate => ({
      ...candidate,
      score: this.calculateProviderScore(candidate, criteria),
    }))

    const sorted = scored.sort((a, b) => {
      // First by score (higher is better)
      if (a.score !== b.score) {
        return b.score - a.score
      }

      // Then by health (healthy providers first)
      if (a.health.healthy !== b.health.healthy) {
        return a.health.healthy ? -1 : 1
      }

      // Then by priority (higher priority first)
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }

      // Finally by usage count (less used first for load balancing)
      return a.usageCount - b.usageCount
    })

    const selected = sorted[0]

    // Update usage count
    selected.usageCount++
    selected.lastUsed = new Date()

    return {
      provider: selected.provider,
      name: selected.name,
      reason: this.generateSelectionReason(selected, criteria),
    }
  }

  /**
   * Filter candidates based on selection criteria
   */
  private filterCandidatesByCriteria<T extends IProvider>(
    candidates: ProviderRegistration<T>[],
    criteria: ProviderSelectionCriteria
  ): ProviderRegistration<T>[] {
    return candidates.filter(candidate => {
      // Check exclusions
      if (criteria.exclude?.includes(candidate.name)) {
        return false
      }

      // Check requirements
      if (
        criteria.require?.length &&
        !criteria.require.includes(candidate.name)
      ) {
        return false
      }

      // Check cost constraints
      if (criteria.maxCost !== undefined) {
        const cost = this.getProviderCost(candidate)
        if (cost > criteria.maxCost) {
          return false
        }
      }

      // Check success rate constraints
      if (criteria.minSuccessRate !== undefined) {
        const successRate = this.getProviderSuccessRate(candidate)
        if (successRate < criteria.minSuccessRate) {
          return false
        }
      }

      // Check response time constraints
      if (criteria.maxResponseTime !== undefined) {
        const avgResponseTime = this.getProviderAverageResponseTime(candidate)
        if (avgResponseTime > criteria.maxResponseTime) {
          return false
        }
      }

      // Check model preferences (for AI providers)
      if (
        criteria.preferredModels?.length &&
        'getAvailableModels' in candidate.provider
      ) {
        const availableModels = (
          candidate.provider as { getAvailableModels: () => string[] }
        ).getAvailableModels()
        const hasPreferredModel = criteria.preferredModels.some(model =>
          availableModels.includes(model)
        )
        if (!hasPreferredModel) {
          return false
        }
      }

      // Check capabilities
      if (criteria.capabilities?.length) {
        const providerCapabilities = candidate.provider.metadata.capabilities
        const hasRequiredCapabilities = criteria.capabilities.every(
          capability => providerCapabilities.includes(capability)
        )
        if (!hasRequiredCapabilities) {
          return false
        }
      }

      return true
    })
  }

  /**
   * Calculate provider score based on criteria
   */
  private calculateProviderScore<T extends IProvider>(
    candidate: ProviderRegistration<T>,
    criteria: ProviderSelectionCriteria
  ): number {
    let score = 0

    // Base health score (0-100)
    score += candidate.health.healthy ? 100 : 0

    // Priority score (0-50)
    score += candidate.priority * 10

    // Performance score based on response time
    const avgResponseTime = this.getProviderAverageResponseTime(candidate)
    if (avgResponseTime > 0) {
      if (avgResponseTime < 1000) {
        score += 30
      } // Excellent
      else if (avgResponseTime < 3000) {
        score += 20
      } // Good
      else if (avgResponseTime < 10000) {
        score += 10
      } // Acceptable
    }

    // Reliability score based on success rate
    const successRate = this.getProviderSuccessRate(candidate)
    score += successRate * 20 // 0-20 points

    // Cost score (lower cost = higher score)
    const cost = this.getProviderCost(candidate)
    if (cost === 0) {
      score += 25
    } // Free providers get bonus
    else if (cost < 0.01) {
      score += 20
    } else if (cost < 0.05) {
      score += 15
    } else if (cost < 0.1) {
      score += 10
    }

    // Usage balancing (less used = higher score)
    const maxUsage = Math.max(
      ...Array.from(this.providers.values()).map(p => p.usageCount)
    )
    if (maxUsage > 0) {
      score += (1 - candidate.usageCount / maxUsage) * 15
    }

    // Priority-based scoring
    switch (criteria.priority) {
      case 'performance':
        // Emphasize response time and success rate
        score =
          score * 0.6 +
          (avgResponseTime > 0 ? (10000 - avgResponseTime) / 100 : 0) * 0.4
        break
      case 'reliability':
        // Emphasize health and success rate
        score = score * 0.7 + successRate * 30 * 0.3
        break
      case 'cost':
        // Emphasize cost efficiency
        score =
          score * 0.5 + (cost === 0 ? 50 : Math.max(0, 50 - cost * 1000)) * 0.5
        break
      case 'balanced':
      default:
        // Use the calculated score as-is
        break
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Get provider cost estimate
   */
  private getProviderCost<T extends IProvider>(
    candidate: ProviderRegistration<T>
  ): number {
    return candidate.provider.metadata.costPerRequest || 0
  }

  /**
   * Get provider success rate
   */
  private getProviderSuccessRate<T extends IProvider>(
    candidate: ProviderRegistration<T>
  ): number {
    // This would be calculated from historical data
    // For now, return a default value based on health
    return candidate.health.healthy ? 0.95 : 0.5
  }

  /**
   * Get provider average response time
   */
  private getProviderAverageResponseTime<T extends IProvider>(
    candidate: ProviderRegistration<T>
  ): number {
    return candidate.health.responseTime || 0
  }

  /**
   * Generate selection reason
   */
  private generateSelectionReason<T extends IProvider>(
    candidate: ProviderRegistration<T>,
    _criteria: ProviderSelectionCriteria
  ): string {
    const reasons = []

    if (candidate.health.healthy) {
      reasons.push('healthy')
    }

    if (candidate.priority > 1) {
      reasons.push(`priority ${candidate.priority}`)
    }

    const avgResponseTime = this.getProviderAverageResponseTime(candidate)
    if (avgResponseTime > 0 && avgResponseTime < 1000) {
      reasons.push('fast response')
    }

    const cost = this.getProviderCost(candidate)
    if (cost === 0) {
      reasons.push('free')
    } else if (cost < 0.01) {
      reasons.push('low cost')
    }

    const successRate = this.getProviderSuccessRate(candidate)
    if (successRate > 0.95) {
      reasons.push('high reliability')
    }

    if (candidate.usageCount === 0) {
      reasons.push('unused')
    }

    return `Selected ${candidate.name} (${reasons.join(', ')})`
  }

  /**
   * Perform health checks on all providers
   */
  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.providers.entries()).map(
      async ([name, registration]) => {
        try {
          const startTime = Date.now()
          const isHealthy = await registration.provider.validateConnection()
          const responseTime = Date.now() - startTime

          this.updateProviderHealth(name, isHealthy, responseTime)
        } catch (error) {
          this.updateProviderHealth(
            name,
            false,
            undefined,
            error instanceof Error ? error.message : 'Unknown error'
          )
        }
      }
    )

    await Promise.allSettled(healthCheckPromises)
  }
}

export default ProviderRegistry
