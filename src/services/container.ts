import { APIConfig } from '../api/clients/base/types'
import { ESPNClient } from '../api/clients/ESPNClient'
import { NFLDataService } from './NFLDataService'
import { ParlayService } from './ParlayService'

// Optional configuration interface for initializing clients from the outside
export interface ServiceContainerConfig {
  espn?: Partial<APIConfig>
}

/**
 * Centralized dependency container with lazy singletons.
 * - All getters are safe to call repeatedly.
 * - You can override instances for tests using the register methods.
 */
export class ServiceContainer {
  private static _instance: ServiceContainer | undefined

  // Cached singletons
  private espnClient?: ESPNClient
  private nflDataService?: NFLDataService
  private parlayService?: ParlayService

  // Optional static config used at first instantiation
  private static _bootstrapConfig?: ServiceContainerConfig

  // ----- lifecycle -----

  static get instance(): ServiceContainer {
    if (!this._instance) {
      this._instance = new ServiceContainer(this._bootstrapConfig)
    }
    return this._instance
  }

  /**
   * Provide initial config before first access.
   * Call this once at app bootstrap if you want to override defaults.
   */
  static configure(cfg: ServiceContainerConfig): void {
    this._bootstrapConfig = cfg
  }

  /**
   * Reset the container. Intended for tests or hot reload edge cases.
   */
  static reset(): void {
    this._instance = undefined
  }

  private constructor(private readonly config?: ServiceContainerConfig) {}

  // ----- registration for tests or manual overrides -----

  registerESPNClient(instance: ESPNClient): void {
    this.espnClient = instance
  }

  registerNFLDataService(instance: NFLDataService): void {
    this.nflDataService = instance
  }

  registerParlayService(instance: ParlayService): void {
    this.parlayService = instance
  }

  // ----- clients -----

  getESPNClient(): ESPNClient {
    if (!this.espnClient) {
      // Pass the ESPN config if provided
      this.espnClient = new ESPNClient(this.config?.espn)
    }
    return this.espnClient
  }

  // ----- services -----

  getNFLDataService(): NFLDataService {
    if (!this.nflDataService) {
      // No casting needed - ESPNClient implements INFLClient
      this.nflDataService = new NFLDataService(this.getESPNClient())
    }
    return this.nflDataService
  }

  getParlayService(): ParlayService {
    if (!this.parlayService) {
      // No casting needed - ESPNClient implements INFLClient
      this.parlayService = new ParlayService(
        this.getESPNClient(),
        this.getNFLDataService()
      )
    }
    return this.parlayService
  }

  // ----- utility methods -----

  /**
   * Clear all cached services (useful for testing)
   */
  clear(): void {
    this.espnClient = undefined
    this.nflDataService = undefined
    this.parlayService = undefined
  }

  /**
   * Get all registered services (useful for debugging)
   */
  getRegisteredServices(): Record<string, boolean> {
    return {
      espnClient: !!this.espnClient,
      nflDataService: !!this.nflDataService,
      parlayService: !!this.parlayService,
    }
  }
}

/**
 * Convenience accessors if you prefer free functions over calling through the class.
 * These all resolve from the same underlying singleton container instance.
 */
export const getESPNClient = (): ESPNClient =>
  ServiceContainer.instance.getESPNClient()

export const getNFLDataService = (): NFLDataService =>
  ServiceContainer.instance.getNFLDataService()

export const getParlayService = (): ParlayService =>
  ServiceContainer.instance.getParlayService()

/**
 * Get the container instance directly
 */
export const getContainer = (): ServiceContainer => ServiceContainer.instance
