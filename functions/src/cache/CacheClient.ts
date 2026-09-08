import { log } from '../observability/logger'
import { inc, observe } from '../observability/metrics'

export interface CacheConfig {
  defaultTtlMs: number
  maxTtlMs: number
  namespace: string
}

export interface CacheEntry<T> {
  value: T
  expiresAt: number
  version: string
  createdAt: number
}

export interface CacheOptions {
  ttlMs?: number
  version?: string
  tags?: string[]
}

export class CacheClient {
  private memoryCache = new Map<string, CacheEntry<unknown>>()
  private config: CacheConfig
  private inflightRequests = new Map<string, Promise<unknown>>()

  constructor(config: CacheConfig) {
    this.config = config
  }

  /**
   * Generate a namespaced cache key
   */
  private makeKey(provider: string, params: Record<string, unknown>): string {
    const paramStr = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${JSON.stringify(v)}`)
      .join('|')
    return `${this.config.namespace}:${provider}:${paramStr}`
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() > entry.expiresAt
  }

  /**
   * Get value from cache (memory first, then fallback to Firestore)
   */
  async get<T>(
    provider: string,
    params: Record<string, unknown>,
    options: CacheOptions = {}
  ): Promise<T | null> {
    const key = this.makeKey(provider, params)
    const version = options.version || '1.0.0'

    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key) as CacheEntry<T> | undefined
    if (
      memoryEntry &&
      !this.isExpired(memoryEntry) &&
      memoryEntry.version === version
    ) {
      inc('cache_hits_memory')
      observe('cache_latency_ms', 0.1) // Memory access is very fast
      return memoryEntry.value
    }

    // Check if request is already in flight
    if (this.inflightRequests.has(key)) {
      return (await this.inflightRequests.get(key)) as T | null
    }

    // Try Firestore cache
    const firestoreEntry = await this.getFromFirestore<T>(key)
    if (firestoreEntry && !this.isExpired(firestoreEntry)) {
      // Populate memory cache
      this.memoryCache.set(key, firestoreEntry)
      inc('cache_hits_firestore')
      observe('cache_latency_ms', 5) // Firestore access
      return firestoreEntry.value
    }

    inc('cache_misses')
    return null
  }

  /**
   * Set value in cache (both memory and Firestore)
   */
  async set<T>(
    provider: string,
    params: Record<string, unknown>,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const key = this.makeKey(provider, params)
    const ttlMs = Math.min(
      options.ttlMs || this.config.defaultTtlMs,
      this.config.maxTtlMs
    )
    const version = options.version || '1.0.0'

    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttlMs,
      version,
      createdAt: Date.now(),
    }

    // Set in memory cache
    this.memoryCache.set(key, entry)

    // Set in Firestore (async, don't wait)
    this.setInFirestore(key, entry).catch(err => {
      log.warn('cache.firestore.set.failed', {
        key,
        error: { code: 'firestore_error', message: err.message },
      })
    })
  }

  /**
   * Get or set with automatic request collapsing
   */
  async getOrSet<T>(
    provider: string,
    params: Record<string, unknown>,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const key = this.makeKey(provider, params)

    // Check cache first
    const cached = await this.get<T>(provider, params, options)
    if (cached !== null) {
      return cached
    }

    // Check if request is already in flight
    if (this.inflightRequests.has(key)) {
      return (await this.inflightRequests.get(key)) as T
    }

    // Create new request
    const requestPromise = this.executeWithCollapse(
      key,
      provider,
      params,
      factory,
      options
    )
    this.inflightRequests.set(key, requestPromise)

    try {
      const result = await requestPromise
      return result as T
    } finally {
      this.inflightRequests.delete(key)
    }
  }

  /**
   * Execute factory function with request collapsing
   */
  private async executeWithCollapse<T>(
    key: string,
    provider: string,
    params: Record<string, unknown>,
    factory: () => Promise<T>,
    options: CacheOptions
  ): Promise<T> {
    const startTime = Date.now()
    try {
      const result = await factory()
      await this.set(provider, params, result, options)
      observe('provider_duration_ms', Date.now() - startTime)
      inc('provider_calls_success')
      return result
    } catch (error) {
      observe('provider_duration_ms', Date.now() - startTime)
      inc('provider_calls_error')
      log.error('cache.factory.error', {
        key,
        provider,
        error: {
          code: 'factory_error',
          message: error instanceof Error ? error.message : String(error),
        },
      })
      throw error
    }
  }

  /**
   * Get from Firestore cache
   */
  private async getFromFirestore<T>(
    key: string
  ): Promise<CacheEntry<T> | null> {
    try {
      const { getCached } = await import('../utils/cache')
      return await getCached<CacheEntry<T>>(key, this.config.maxTtlMs)
    } catch (error) {
      log.warn('cache.firestore.get.failed', {
        key,
        error: {
          code: 'firestore_error',
          message: error instanceof Error ? error.message : String(error),
        },
      })
      return null
    }
  }

  /**
   * Set in Firestore cache
   */
  private async setInFirestore<T>(
    key: string,
    entry: CacheEntry<T>
  ): Promise<void> {
    try {
      const { setCached } = await import('../utils/cache')
      await setCached(key, entry)
    } catch (error) {
      log.warn('cache.firestore.set.failed', {
        key,
        error: {
          code: 'firestore_error',
          message: error instanceof Error ? error.message : String(error),
        },
      })
    }
  }

  /**
   * Clear memory cache
   */
  clearMemory(): void {
    this.memoryCache.clear()
    log.info('cache.memory.cleared')
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memorySize: number
    inflightRequests: number
    config: CacheConfig
  } {
    return {
      memorySize: this.memoryCache.size,
      inflightRequests: this.inflightRequests.size,
      config: this.config,
    }
  }

  /**
   * Clean up expired entries from memory cache
   */
  cleanup(): void {
    let cleaned = 0
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key)
        cleaned++
      }
    }
    if (cleaned > 0) {
      inc('cache_evictions', cleaned)
    }
  }
}

// Default cache configuration
export const defaultCacheConfig: CacheConfig = {
  defaultTtlMs: 60_000, // 1 minute
  maxTtlMs: 300_000, // 5 minutes
  namespace: 'nfl_parlay',
}

// Global cache instance
export const cache = new CacheClient(defaultCacheConfig)

// Periodic cleanup
setInterval(() => {
  cache.cleanup()
}, 60_000) // Clean up every minute
