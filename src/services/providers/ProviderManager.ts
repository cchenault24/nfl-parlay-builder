// ================================================================================================
// PROVIDER MANAGER - Configuration-driven provider loading and management
// ================================================================================================

import {
  AIProviderType,
  DataProviderType,
  IAIProvider,
  IDataProvider,
  IProviderFactory,
  IProviderRegistry,
  ProviderFactoryConfig,
  ProviderRegistryConfig,
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
    this.config = {
      factory: {},
      registry: {},
      autoInitialize: true,
      defaultAIProvider: 'openai',
      defaultDataProvider: 'espn',
      ...config,
    }

    this.factory = new ProviderFactory(this.config.factory)
    this.registry = new ProviderRegistry(this.config.registry)

    if (this.config.autoInitialize) {
      this.initialize().catch(console.error)
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
      console.log('Provider Manager initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Provider Manager:', error)
      throw error
    }
  }

  /**
   * Get AI provider by name or select best available
   */
  async getAIProvider(name?: string): Promise<IAIProvider> {
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

    // Select best available AI provider
    const result = await this.registry.selectProvider<IAIProvider>({
      type: 'ai',
      priority: 'performance',
    })

    if (!result) {
      throw new Error('No AI providers available')
    }

    return result.provider
  }

  /**
   * Get data provider by name or select best available
   */
  async getDataProvider(name?: string): Promise<IDataProvider> {
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

    // Select best available data provider
    const result = await this.registry.selectProvider<IDataProvider>({
      type: 'data',
      priority: 'reliability',
    })

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
    // Load default AI providers
    try {
      const mockAI = await this.factory.createAIProvider('mock', {
        config: {
          name: 'mock-ai',
          enabled: true,
          priority: 1,
          timeout: 30000,
          retries: 3,
          model: 'mock-gpt-4',
          temperature: 0.7,
          maxTokens: 4000,
          debugMode: true,
        },
      })
      this.registry.register('mock-ai', mockAI, 'ai', 1)
    } catch (error) {
      console.warn('Failed to load mock AI provider:', error)
    }

    // Load default data providers
    try {
      const mockData = await this.factory.createDataProvider('mock', {
        config: {
          name: 'mock-data',
          enabled: true,
          priority: 1,
        },
      })
      this.registry.register('mock-data', mockData, 'data', 1)
    } catch (error) {
      console.warn('Failed to load mock data provider:', error)
    }

    // Load OpenAI provider if API key is available
    const openaiApiKey = this.getEnvironmentVariable('OPENAI_API_KEY')
    if (openaiApiKey) {
      try {
        const openai = await this.factory.createAIProvider('openai', {
          config: {
            name: 'openai',
            enabled: true,
            priority: 2,
            apiKey: openaiApiKey,
          },
          apiKey: openaiApiKey,
        })
        this.registry.register('openai', openai, 'ai', 2)
      } catch (error) {
        console.warn('Failed to load OpenAI provider:', error)
      }
    }

    // Load ESPN provider
    try {
      const espn = await this.factory.createDataProvider('espn', {
        config: {
          name: 'espn',
          enabled: true,
          priority: 2,
        },
      })
      this.registry.register('espn', espn, 'data', 2)
    } catch (error) {
      console.warn('Failed to load ESPN provider:', error)
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
