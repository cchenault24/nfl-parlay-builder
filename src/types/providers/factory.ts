// ================================================================================================
// PROVIDER FACTORY TYPES - Dynamic provider creation and configuration
// ================================================================================================

import { AIProviderFactoryConfig, AIProviderType, IAIProvider } from './ai'
import { IProvider, ProviderError } from './base'
import {
  DataProviderFactoryConfig,
  DataProviderType,
  IDataProvider,
} from './data'
import { ProviderConfigData, ParsedError } from '../api'

/**
 * Provider factory configuration
 */
export interface ProviderFactoryConfig {
  aiProviders: AIProviderFactoryConfig[]
  dataProviders: DataProviderFactoryConfig[]
  defaultAIProvider: AIProviderType
  defaultDataProvider: DataProviderType
  enableFallback: boolean
  healthCheckInterval: number
}

/**
 * Provider creation result
 */
export interface ProviderCreationResult<T extends IProvider> {
  provider: T
  success: boolean
  error?: string
}

/**
 * Provider factory interface for creating providers dynamically
 */
export interface IProviderFactory {
  /**
   * Create an AI provider
   */
  createAIProvider(
    type: AIProviderType,
    config: Partial<AIProviderFactoryConfig>
  ): Promise<IAIProvider>

  /**
   * Create a data provider
   */
  createDataProvider(
    type: DataProviderType,
    config: Partial<DataProviderFactoryConfig>
  ): Promise<IDataProvider>

  /**
   * Get available AI provider types
   */
  getAvailableAIProviders(): AIProviderType[]

  /**
   * Get available data provider types
   */
  getAvailableDataProviders(): DataProviderType[]

  /**
   * Validate provider configuration
   */
  validateProviderConfig(type: string, config: ProviderConfigData): boolean

  /**
   * Get provider factory configuration
   */
  getConfig(): ProviderFactoryConfig

  /**
   * Update provider factory configuration
   */
  updateConfig(config: Partial<ProviderFactoryConfig>): void

  /**
   * Register a custom AI provider creator
   */
  registerAICreator(
    type: AIProviderType,
    creator: (config: AIProviderFactoryConfig) => Promise<IAIProvider>
  ): void

  /**
   * Register a custom data provider creator
   */
  registerDataCreator(
    type: DataProviderType,
    creator: (config: DataProviderFactoryConfig) => Promise<IDataProvider>
  ): void
}

/**
 * Provider factory error
 */
export class ProviderFactoryError extends ProviderError {
  constructor(message: string, providerType: string, code?: string) {
    super(message, providerType, code, false)
    this.name = 'ProviderFactoryError'
  }
}

/**
 * Provider not found error
 */
export class ProviderNotFoundError extends ProviderFactoryError {
  constructor(providerType: string) {
    super(
      `Provider type '${providerType}' not found`,
      providerType,
      'NOT_FOUND'
    )
    this.name = 'ProviderNotFoundError'
  }
}

/**
 * Provider creation error
 */
export class ProviderCreationError extends ProviderFactoryError {
  constructor(providerType: string, message: string, originalError?: Error) {
    super(
      `Failed to create provider '${providerType}': ${message}`,
      providerType,
      'CREATION_FAILED'
    )
    this.name = 'ProviderCreationError'
    if (originalError) {
      ;(this as { cause?: ParsedError }).cause = originalError as ParsedError
    }
  }
}
