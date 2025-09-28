// ================================================================================================
// DATA FUSION SERVICE - Multi-source data validation and fusion
// ================================================================================================

import {
  BaseProviderData,
  DataProviderResponse,
  IDataProvider,
} from '../../types/providers'

/**
 * Data fusion configuration
 */
export interface DataFusionConfig {
  enableValidation: boolean
  enableConflictResolution: boolean
  confidenceThreshold: number
  maxRetries: number
  timeout: number
}

/**
 * Data validation result
 */
export interface DataValidationResult<T> {
  isValid: boolean
  confidence: number
  conflicts: DataConflict[]
  warnings: string[]
  validatedData: T
}

/**
 * Data conflict between sources
 */
export interface DataConflict {
  field: string
  sources: {
    provider: string
    value: string | number | boolean | object | null
    confidence: number
  }[]
  resolution?: string | number | boolean | object | null
  resolutionMethod: 'majority' | 'highest_confidence' | 'most_recent' | 'manual'
}

/**
 * Fused data result
 */
export interface FusedDataResult<T> {
  data: T
  confidence: number
  sources: string[]
  conflicts: DataConflict[]
  lastUpdated: Date
}

/**
 * Data fusion service for combining and validating data from multiple sources
 */
export class DataFusionService {
  private config: DataFusionConfig
  private providers: Map<string, IDataProvider>

  constructor(
    providers: Map<string, IDataProvider>,
    config: Partial<DataFusionConfig> = {}
  ) {
    this.providers = providers
    this.config = {
      enableValidation: true,
      enableConflictResolution: true,
      confidenceThreshold: 0.7,
      maxRetries: 3,
      timeout: 30000,
      ...config,
    }
  }

  /**
   * Fuse data from multiple providers
   */
  async fuseData<T>(
    operation: (provider: IDataProvider) => Promise<DataProviderResponse<T>>,
    providers: string[] = Array.from(this.providers.keys())
  ): Promise<FusedDataResult<T>> {
    const results: Array<{
      provider: string
      data: T
      confidence: number
      timestamp: Date
      error?: string
    }> = []

    // Collect data from all providers
    const promises = providers.map(async providerName => {
      const provider = this.providers.get(providerName)
      if (!provider) {
        return { provider: providerName, error: 'Provider not found' }
      }

      try {
        const response = await operation(provider)
        return {
          provider: providerName,
          data: response.data,
          confidence: this.calculateProviderConfidence(provider, response),
          timestamp: response.timestamp || new Date(),
        }
      } catch (error) {
        return {
          provider: providerName,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    })

    const responses = await Promise.allSettled(promises)

    responses.forEach((result, _index) => {
      if (result.status === 'fulfilled' && !result.value.error) {
        results.push(
          result.value as {
            provider: string
            data: T
            confidence: number
            timestamp: Date
          }
        )
      }
    })

    if (results.length === 0) {
      throw new Error('No providers returned valid data')
    }

    // Validate and fuse the data
    const validation = this.validateData(
      results as Array<{
        provider: string
        data: BaseProviderData
        confidence: number
        timestamp: Date
      }>
    )
    const fusedData = this.resolveConflicts(validation)

    return {
      data: fusedData.validatedData as T,
      confidence: fusedData.confidence,
      sources: results.map(r => r.provider),
      conflicts: fusedData.conflicts,
      lastUpdated: new Date(),
    }
  }

  /**
   * Validate data consistency across providers
   */
  validateData<T extends BaseProviderData>(
    results: Array<{
      provider: string
      data: T
      confidence: number
      timestamp: Date
    }>
  ): DataValidationResult<T> {
    const conflicts: DataConflict[] = []
    const warnings: string[] = []
    let totalConfidence = 0

    // Simple validation - check if all data is similar
    if (results.length === 1) {
      return {
        isValid: true,
        confidence: results[0].confidence,
        conflicts: [],
        warnings: ['Only one data source available'],
        validatedData: results[0].data,
      }
    }

    // Compare data across providers
    const baseData = results[0].data
    const baseKeys = this.getDataKeys(baseData)

    for (const key of baseKeys) {
      const values = results.map(r => ({
        provider: r.provider,
        value: this.getNestedValue(r.data, key) as
          | string
          | number
          | boolean
          | object
          | null,
        confidence: r.confidence,
      }))

      const uniqueValues = new Set(values.map(v => JSON.stringify(v.value)))

      if (uniqueValues.size > 1) {
        conflicts.push({
          field: key,
          sources: values,
          resolutionMethod: 'highest_confidence',
        })
      }
    }

    // Calculate overall confidence
    totalConfidence =
      results.reduce((sum, r) => sum + r.confidence, 0) / results.length

    // Check for data staleness
    const now = new Date()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    const staleProviders = results.filter(
      r => now.getTime() - r.timestamp.getTime() > maxAge
    )

    if (staleProviders.length > 0) {
      warnings.push(`${staleProviders.length} providers returned stale data`)
    }

    const isValid =
      conflicts.length === 0 &&
      totalConfidence >= this.config.confidenceThreshold

    return {
      isValid,
      confidence: totalConfidence,
      conflicts,
      warnings,
      validatedData: baseData,
    }
  }

  /**
   * Resolve data conflicts
   */
  resolveConflicts<T extends BaseProviderData>(
    validation: DataValidationResult<T>
  ): {
    validatedData: T
    confidence: number
    conflicts: DataConflict[]
  } {
    if (
      !this.config.enableConflictResolution ||
      validation.conflicts.length === 0
    ) {
      return {
        validatedData: validation.validatedData,
        confidence: validation.confidence,
        conflicts: validation.conflicts,
      }
    }

    const resolvedData = { ...validation.validatedData }
    const resolvedConflicts = [...validation.conflicts]

    for (const conflict of resolvedConflicts) {
      const resolution = this.resolveConflict(conflict)
      conflict.resolution = resolution

      // Apply resolution to data
      this.setNestedValue(resolvedData, conflict.field, resolution)
    }

    // Adjust confidence based on conflicts
    const conflictPenalty = resolvedConflicts.length * 0.1
    const adjustedConfidence = Math.max(
      0,
      validation.confidence - conflictPenalty
    )

    return {
      validatedData: resolvedData,
      confidence: adjustedConfidence,
      conflicts: resolvedConflicts,
    }
  }

  /**
   * Resolve a single data conflict
   */
  private resolveConflict(
    conflict: DataConflict
  ): string | number | boolean | object | null {
    switch (conflict.resolutionMethod) {
      case 'highest_confidence': {
        return conflict.sources.reduce((best, current) =>
          current.confidence > best.confidence ? current : best
        ).value
      }

      case 'most_recent': {
        // This would require timestamps in the conflict data
        return conflict.sources[0].value
      }

      case 'majority': {
        const valueCounts = new Map<string, number>()
        conflict.sources.forEach(source => {
          const key = JSON.stringify(source.value)
          valueCounts.set(key, (valueCounts.get(key) || 0) + 1)
        })

        const mostCommon = Array.from(valueCounts.entries()).sort(
          (a, b) => b[1] - a[1]
        )[0]

        return JSON.parse(mostCommon[0]) as
          | string
          | number
          | boolean
          | object
          | null
      }

      default:
        return conflict.sources[0].value
    }
  }

  /**
   * Calculate provider confidence based on health and metadata
   */
  private calculateProviderConfidence<T>(
    provider: IDataProvider,
    response: DataProviderResponse<T>
  ): number {
    let confidence = 0.5 // Base confidence

    // Health factor
    const health = provider.getHealth()
    if (health.healthy) {
      confidence += 0.3
    }

    // Response time factor - check if response has latency metadata
    const responseWithLatency = response as DataProviderResponse<T> & {
      metadata?: { latency?: number }
    }
    if (responseWithLatency.metadata?.latency) {
      if (responseWithLatency.metadata.latency < 1000) {
        confidence += 0.2
      } else if (responseWithLatency.metadata.latency < 3000) {
        confidence += 0.1
      }
    }

    // Data quality factor
    const metadata = provider.metadata
    if (metadata.dataQuality === 'high') {
      confidence += 0.2
    } else if (metadata.dataQuality === 'medium') {
      confidence += 0.1
    }

    // Cached data penalty
    if (response.cached) {
      confidence -= 0.1
    }

    return Math.max(0, Math.min(1, confidence))
  }

  /**
   * Get all keys from a data object (recursive)
   */
  private getDataKeys(obj: BaseProviderData, prefix = ''): string[] {
    const keys: string[] = []

    if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key
        keys.push(fullKey)

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          keys.push(...this.getDataKeys(value as BaseProviderData, fullKey))
        }
      }
    }

    return keys
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(
    obj: BaseProviderData,
    path: string
  ): string | number | boolean | object | null | undefined {
    return path.split('.').reduce(
      (current, key) => {
        if (current && typeof current === 'object' && key in current) {
          return (current as BaseProviderData)[key] as
            | string
            | number
            | boolean
            | object
            | null
            | undefined
        }
        return undefined
      },
      obj as string | number | boolean | object | null | undefined
    )
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(
    obj: BaseProviderData,
    path: string,
    value: string | number | boolean | object | null
  ): void {
    const keys = path.split('.')
    const lastKey = keys.pop()!
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {}
      }
      return current[key] as BaseProviderData
    }, obj)

    target[lastKey] = value
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DataFusionConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): DataFusionConfig {
    return { ...this.config }
  }
}

export default DataFusionService
