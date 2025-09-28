// ================================================================================================
// PROVIDER FACTORY - Dynamic provider creation and configuration
// ================================================================================================

import {
  AIProviderFactoryConfig,
  AIProviderType,
  DataProviderFactoryConfig,
  DataProviderType,
  IAIProvider,
  IDataProvider,
  IProviderFactory,
  ProviderCreationError,
  ProviderFactoryConfig,
  ProviderNotFoundError,
} from '../../types/providers'

/**
 * Provider factory implementation for creating AI and data providers
 */
export class ProviderFactory implements IProviderFactory {
  private config: ProviderFactoryConfig
  private aiProviderCreators: Map<
    AIProviderType,
    (config: AIProviderFactoryConfig) => Promise<IAIProvider>
  >
  private dataProviderCreators: Map<
    DataProviderType,
    (config: DataProviderFactoryConfig) => Promise<IDataProvider>
  >

  constructor(config: Partial<ProviderFactoryConfig> = {}) {
    this.config = {
      aiProviders: [],
      dataProviders: [],
      defaultAIProvider: 'openai',
      defaultDataProvider: 'espn',
      enableFallback: true,
      healthCheckInterval: 5 * 60 * 1000, // 5 minutes
      ...config,
    }

    this.aiProviderCreators = new Map()
    this.dataProviderCreators = new Map()

    this.initializeCreators()
  }

  /**
   * Create an AI provider
   */
  async createAIProvider(
    type: AIProviderType,
    config: Partial<AIProviderFactoryConfig>
  ): Promise<IAIProvider> {
    const creator = this.aiProviderCreators.get(type)
    if (!creator) {
      throw new ProviderNotFoundError(type)
    }

    try {
      const fullConfig: AIProviderFactoryConfig = {
        type,
        config: {
          name: type,
          enabled: true,
          priority: 1,
          timeout: 30000,
          retries: 3,
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 4000,
          ...config.config,
        },
        apiKey: config.apiKey,
        ...config,
      }

      return await creator(fullConfig)
    } catch (error) {
      throw new ProviderCreationError(
        type,
        error instanceof Error ? error.message : 'Unknown error',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Create a data provider
   */
  async createDataProvider(
    type: DataProviderType,
    config: Partial<DataProviderFactoryConfig>
  ): Promise<IDataProvider> {
    const creator = this.dataProviderCreators.get(type)
    if (!creator) {
      throw new ProviderNotFoundError(type)
    }

    try {
      const fullConfig: DataProviderFactoryConfig = {
        type,
        config: {
          name: type,
          enabled: true,
          priority: 1,
          timeout: 30000,
          retries: 3,
          baseURL: this.getDefaultBaseURL(type),
          ...config.config,
        },
        apiKey: config.apiKey,
        ...config,
      }

      return await creator(fullConfig)
    } catch (error) {
      throw new ProviderCreationError(
        type,
        error instanceof Error ? error.message : 'Unknown error',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Get available AI provider types
   */
  getAvailableAIProviders(): AIProviderType[] {
    return Array.from(this.aiProviderCreators.keys())
  }

  /**
   * Get available data provider types
   */
  getAvailableDataProviders(): DataProviderType[] {
    return Array.from(this.dataProviderCreators.keys())
  }

  /**
   * Validate provider configuration
   */
  validateProviderConfig(
    type: string,
    config: Record<string, unknown>
  ): boolean {
    try {
      // Basic validation - can be extended with more specific rules
      if (!config || typeof config !== 'object') {
        return false
      }

      if (this.aiProviderCreators.has(type as AIProviderType)) {
        return this.validateAIConfig(config)
      }

      if (this.dataProviderCreators.has(type as DataProviderType)) {
        return this.validateDataConfig(config)
      }

      return false
    } catch {
      return false
    }
  }

  /**
   * Get provider factory configuration
   */
  getConfig(): ProviderFactoryConfig {
    return { ...this.config }
  }

  /**
   * Update provider factory configuration
   */
  updateConfig(config: Partial<ProviderFactoryConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Register a custom AI provider creator
   */
  registerAICreator(
    type: AIProviderType,
    creator: (config: AIProviderFactoryConfig) => Promise<IAIProvider>
  ): void {
    this.aiProviderCreators.set(type, creator)
  }

  /**
   * Register a custom data provider creator
   */
  registerDataCreator(
    type: DataProviderType,
    creator: (config: DataProviderFactoryConfig) => Promise<IDataProvider>
  ): void {
    this.dataProviderCreators.set(type, creator)
  }

  // ===== PRIVATE METHODS =====

  /**
   * Initialize provider creators
   */
  private initializeCreators(): void {
    // AI Provider creators will be registered when the actual providers are imported
    // This allows for lazy loading and avoids circular dependencies
  }

  /**
   * Get default base URL for data providers
   */
  private getDefaultBaseURL(type: DataProviderType): string {
    switch (type) {
      case 'espn':
        return 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'
      case 'nfl':
        return 'https://api.nfl.com/v1'
      case 'sportradar':
        return 'https://api.sportradar.com/nfl'
      case 'mock':
        return 'http://localhost:3000/mock'
      default:
        return 'https://api.example.com'
    }
  }

  /**
   * Validate AI provider configuration
   */
  private validateAIConfig(config: Record<string, unknown>): boolean {
    return (
      typeof config.name === 'string' &&
      typeof config.enabled === 'boolean' &&
      typeof config.priority === 'number' &&
      typeof config.timeout === 'number' &&
      typeof config.retries === 'number' &&
      typeof config.model === 'string' &&
      typeof config.temperature === 'number' &&
      typeof config.maxTokens === 'number'
    )
  }

  /**
   * Validate data provider configuration
   */
  private validateDataConfig(config: Record<string, unknown>): boolean {
    return (
      typeof config.name === 'string' &&
      typeof config.enabled === 'boolean' &&
      typeof config.priority === 'number' &&
      typeof config.timeout === 'number' &&
      typeof config.retries === 'number' &&
      typeof config.baseURL === 'string'
    )
  }
}

export default ProviderFactory
