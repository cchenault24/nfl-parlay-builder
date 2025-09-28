// ================================================================================================
// PROVIDER MANAGER - Configuration-driven provider loading and management
// ================================================================================================

import {
  getProviderConfig,
  PROVIDER_SELECTION_PRESETS,
} from '../../config/providers'
import {
  AIProviderType,
  DataProviderType,
  IAIProvider,
  IDataProvider,
  IProviderFactory,
  IProviderRegistry,
  ProviderFactoryConfig,
  ProviderRegistryConfig,
  ProviderSelectionCriteria,
} from '../../types/providers'
import { ProviderFactory } from './ProviderFactory'
import { ProviderRegistry } from './ProviderRegistry'

/**
 * Provider manager configuration
 */
export interface ProviderManagerConfig {
  factory: Partial<ProviderFactoryConfig>
  registry: Partial<ProviderRegistryConfig>
  autoInitialize: boolean
  defaultAIProvider: AIProviderType
  defaultDataProvider: DataProviderType
}

/**
 * Provider manager for orchestrating factory and registry
 */
export class ProviderManager {
  private factory: IProviderFactory
  private registry: IProviderRegistry
  private config: ProviderManagerConfig
  private initialized: boolean = false

  constructor(config: Partial<ProviderManagerConfig> = {}) {
    // Load environment-specific configuration
    const envConfig = getProviderConfig()

    this.config = {
      factory: {},
      registry: {},
      autoInitialize: true,
      defaultAIProvider: envConfig.ai.primary,
      defaultDataProvider: envConfig.data.primary,
      ...config,
    }

    this.factory = new ProviderFactory(this.config.factory)
    this.registry = new ProviderRegistry(this.config.registry)

    if (this.config.autoInitialize) {
      this.initialize().catch(error => {
        if (import.meta.env.DEV) {
          console.error('Auto-initialization failed:', error)
        }
      })
    }
  }

  /**
   * Initialize the provider manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      // Register provider creators
      await this.registerProviderCreators()

      // Load configured providers
      await this.loadConfiguredProviders()

      this.initialized = true
      if (import.meta.env.DEV) {
        console.debug('Provider Manager initialized successfully')
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to initialize Provider Manager:', error)
      }
      throw error
    }
  }

  /**
   * Get AI provider by name or select best available
   */
  async getAIProvider(
    name?: string,
    criteria?: Partial<ProviderSelectionCriteria>
  ): Promise<IAIProvider> {
    if (!this.initialized) {
      await this.initialize()
    }

    if (name) {
      const provider = this.registry.get<IAIProvider>(name)
      if (provider) {
        return provider
      }
      throw new Error(`AI provider '${name}' not found`)
    }

    // Use provided criteria or default to performance
    const selectionCriteria: ProviderSelectionCriteria = {
      type: 'ai',
      priority: 'performance',
      ...criteria,
    }

    // Select best available AI provider
    const result =
      await this.registry.selectProvider<IAIProvider>(selectionCriteria)

    if (!result) {
      throw new Error('No AI providers available')
    }

    return result.provider
  }

  /**
   * Get data provider by name or select best available
   */
  async getDataProvider(
    name?: string,
    criteria?: Partial<ProviderSelectionCriteria>
  ): Promise<IDataProvider> {
    if (!this.initialized) {
      await this.initialize()
    }

    if (name) {
      const provider = this.registry.get<IDataProvider>(name)
      if (provider) {
        return provider
      }
      throw new Error(`Data provider '${name}' not found`)
    }

    // Use provided criteria or default to reliability
    const selectionCriteria: ProviderSelectionCriteria = {
      type: 'data',
      priority: 'reliability',
      ...criteria,
    }

    // Select best available data provider
    const result =
      await this.registry.selectProvider<IDataProvider>(selectionCriteria)

    if (!result) {
      throw new Error('No data providers available')
    }

    return result.provider
  }

  /**
   * Register a new AI provider
   */
  async registerAIProvider(
    name: string,
    type: AIProviderType,
    config: any,
    priority: number = 1
  ): Promise<IAIProvider> {
    const provider = await this.factory.createAIProvider(type, config)
    this.registry.register(name, provider, 'ai', priority)
    return provider
  }

  /**
   * Register a new data provider
   */
  async registerDataProvider(
    name: string,
    type: DataProviderType,
    config: any,
    priority: number = 1
  ): Promise<IDataProvider> {
    const provider = await this.factory.createDataProvider(type, config)
    this.registry.register(name, provider, 'data', priority)
    return provider
  }

  /**
   * Get all AI providers
   */
  getAIProviders(): Map<string, IAIProvider> {
    return this.registry.getByType<IAIProvider>('ai')
  }

  /**
   * Get all data providers
   */
  getDataProviders(): Map<string, IDataProvider> {
    return this.registry.getByType<IDataProvider>('data')
  }

  /**
   * Select AI provider with specific criteria
   */
  async selectAIProvider(
    criteria:
      | keyof typeof PROVIDER_SELECTION_PRESETS
      | Partial<ProviderSelectionCriteria>
  ): Promise<IAIProvider> {
    const selectionCriteria =
      typeof criteria === 'string'
        ? { ...PROVIDER_SELECTION_PRESETS[criteria], type: 'ai' as const }
        : { type: 'ai' as const, ...criteria }

    const result =
      await this.registry.selectProvider<IAIProvider>(selectionCriteria)
    if (!result) {
      throw new Error('No AI providers available')
    }
    return result.provider
  }

  /**
   * Select data provider with specific criteria
   */
  async selectDataProvider(
    criteria:
      | keyof typeof PROVIDER_SELECTION_PRESETS
      | Partial<ProviderSelectionCriteria>
  ): Promise<IDataProvider> {
    const selectionCriteria =
      typeof criteria === 'string'
        ? { ...PROVIDER_SELECTION_PRESETS[criteria], type: 'data' as const }
        : { type: 'data' as const, ...criteria }

    const result =
      await this.registry.selectProvider<IDataProvider>(selectionCriteria)
    if (!result) {
      throw new Error('No data providers available')
    }
    return result.provider
  }

  /**
   * Get provider health status
   */
  getProviderHealth(name: string) {
    return this.registry.getProviderHealth(name)
  }

  /**
   * Get all provider health statuses
   */
  getAllProviderHealth() {
    return this.registry.getAllProviderHealth()
  }

  /**
   * Update provider configuration
   */
  updateProviderConfig(name: string, config: any): void {
    const provider = this.registry.get(name)
    if (provider) {
      provider.updateConfig(config)
    }
  }

  /**
   * Enable/disable a provider
   */
  setProviderEnabled(name: string, enabled: boolean): void {
    this.registry.setProviderEnabled(name, enabled)
  }

  /**
   * Get provider statistics
   */
  getProviderStats(name: string) {
    return this.registry.getProviderStats(name)
  }

  /**
   * Get manager configuration
   */
  getConfig(): ProviderManagerConfig {
    return { ...this.config }
  }

  /**
   * Update manager configuration
   */
  updateConfig(config: Partial<ProviderManagerConfig>): void {
    this.config = { ...this.config, ...config }

    if (config.factory) {
      this.factory.updateConfig(config.factory)
    }

    if (config.registry) {
      this.registry.updateConfig(config.registry)
    }
  }

  /**
   * Dispose of all providers and cleanup
   */
  async dispose(): Promise<void> {
    this.registry.clear()
    this.initialized = false
  }

  // ===== PRIVATE METHODS =====

  /**
   * Register provider creators with the factory
   */
  private async registerProviderCreators(): Promise<void> {
    // Register AI provider creators
    this.factory.registerAICreator('openai', async (config: any) => {
      const OpenAIProviderModule = await import('./ai/OpenAIProvider')
      const OpenAIProvider = OpenAIProviderModule.default
      return new OpenAIProvider(config.config)
    })

    this.factory.registerAICreator('mock', async (config: any) => {
      const MockProviderModule = await import('./ai/MockProvider')
      const MockProvider = MockProviderModule.default
      return new MockProvider(config.config)
    })

    // Register data provider creators
    this.factory.registerDataCreator('espn', async (config: any) => {
      const ESPNDataProviderModule = await import('./data/ESPNDataProvider')
      const ESPNDataProvider = ESPNDataProviderModule.default
      return new ESPNDataProvider(config.config)
    })

    this.factory.registerDataCreator('mock', async (config: any) => {
      try {
        const MockDataProviderModule = await import(
          './data/MockDataProvider' as any
        )
        const MockDataProvider = MockDataProviderModule.default
        return new MockDataProvider(config.config)
      } catch (error) {
        throw new Error(`Failed to load MockDataProvider: ${error}`)
      }
    })
  }

  /**
   * Load configured providers
   */
  private async loadConfiguredProviders(): Promise<void> {
    const envConfig = getProviderConfig()

    // Load AI providers based on configuration
    for (const [providerType, providerConfig] of Object.entries(
      envConfig.ai.providers
    )) {
      if (!providerConfig?.enabled) continue

      try {
        const provider = await this.factory.createAIProvider(
          providerType as AIProviderType,
          {
            config: {
              name: providerConfig.config.name || providerType,
              enabled: providerConfig.enabled,
              priority: providerConfig.priority,
              timeout: 30000,
              retries: 3,
              ...providerConfig.config,
            },
            apiKey: this.getEnvironmentVariable(
              `${providerType.toUpperCase()}_API_KEY`
            ),
          }
        )

        this.registry.register(
          providerConfig.config.name || providerType,
          provider,
          'ai',
          providerConfig.priority
        )

        if (import.meta.env.DEV) {
          console.debug(`Loaded AI provider: ${providerType}`)
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn(`Failed to load AI provider ${providerType}:`, error)
        }
      }
    }

    // Load data providers based on configuration
    for (const [providerType, providerConfig] of Object.entries(
      envConfig.data.providers
    )) {
      if (!providerConfig?.enabled) continue

      try {
        const provider = await this.factory.createDataProvider(
          providerType as DataProviderType,
          {
            config: {
              name: providerConfig.config.name || providerType,
              enabled: providerConfig.enabled,
              priority: providerConfig.priority,
              timeout: 30000,
              retries: 3,
              ...providerConfig.config,
            },
            apiKey: this.getEnvironmentVariable(
              `${providerType.toUpperCase()}_API_KEY`
            ),
          }
        )

        this.registry.register(
          providerConfig.config.name || providerType,
          provider,
          'data',
          providerConfig.priority
        )

        if (import.meta.env.DEV) {
          console.debug(`Loaded data provider: ${providerType}`)
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn(`Failed to load data provider ${providerType}:`, error)
        }
      }
    }
  }

  /**
   * Get environment variable (works in both browser and Node.js)
   */
  private getEnvironmentVariable(name: string): string | undefined {
    // Try different ways to access environment variables
    if (typeof process !== 'undefined' && process.env) {
      return process.env[name]
    }

    if (typeof window !== 'undefined' && (window as any).import?.meta?.env) {
      return (window as any).import.meta.env[`VITE_${name}`]
    }

    return undefined
  }
}

export default ProviderManager
