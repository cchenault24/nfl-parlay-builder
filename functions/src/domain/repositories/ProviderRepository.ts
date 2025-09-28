import { ProviderConfig } from '../value-objects/ProviderConfig'

/**
 * ProviderRepository interface
 * Defines contract for provider configuration operations
 */
export interface ProviderRepository {
  /**
   * Save provider configuration
   */
  save(config: ProviderConfig): Promise<void>

  /**
   * Find provider by name
   */
  findByName(name: string): Promise<ProviderConfig | null>

  /**
   * Find all providers
   */
  findAll(): Promise<ProviderConfig[]>

  /**
   * Find enabled providers
   */
  findEnabled(): Promise<ProviderConfig[]>

  /**
   * Find providers by type
   */
  findByType(type: 'ai' | 'data'): Promise<ProviderConfig[]>

  /**
   * Find providers by priority
   */
  findByPriority(priority: number): Promise<ProviderConfig[]>

  /**
   * Find providers with API keys
   */
  findWithApiKeys(): Promise<ProviderConfig[]>

  /**
   * Find providers by health score range
   */
  findByHealthScoreRange(
    minScore: number,
    maxScore: number
  ): Promise<ProviderConfig[]>

  /**
   * Update provider configuration
   */
  update(config: ProviderConfig): Promise<void>

  /**
   * Delete provider configuration
   */
  delete(name: string): Promise<void>

  /**
   * Enable provider
   */
  enable(name: string): Promise<void>

  /**
   * Disable provider
   */
  disable(name: string): Promise<void>

  /**
   * Update provider priority
   */
  updatePriority(name: string, priority: number): Promise<void>

  /**
   * Update provider API key
   */
  updateApiKey(name: string, apiKey: string): Promise<void>

  /**
   * Get provider statistics
   */
  getStatistics(): Promise<{
    totalProviders: number
    enabledProviders: number
    disabledProviders: number
    providersWithApiKeys: number
    averageHealthScore: number
    priorityDistribution: Record<number, number>
  }>

  /**
   * Get provider health scores
   */
  getHealthScores(): Promise<Record<string, number>>

  /**
   * Search providers by criteria
   */
  search(criteria: {
    type?: 'ai' | 'data'
    enabled?: boolean
    hasApiKey?: boolean
    minPriority?: number
    maxPriority?: number
    minHealthScore?: number
    maxHealthScore?: number
    limit?: number
    offset?: number
  }): Promise<ProviderConfig[]>
}
