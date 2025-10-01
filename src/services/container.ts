import { ParlayService } from './ParlayService'

/**
 * Centralized dependency container with lazy singletons.
 * - All getters are safe to call repeatedly.
 * - You can override instances for tests using the register methods.
 */
export class ServiceContainer {
  private static _instance: ServiceContainer | undefined

  // Cached singletons
  private parlayService?: ParlayService

  // ----- lifecycle -----

  static get instance(): ServiceContainer {
    if (!this._instance) {
      this._instance = new ServiceContainer()
    }
    return this._instance
  }

  /**
   * Reset the container. Intended for tests or hot reload edge cases.
   */
  static reset(): void {
    this._instance = undefined
  }

  private constructor() {}

  // ----- registration for tests or manual overrides -----

  registerParlayService(instance: ParlayService): void {
    this.parlayService = instance
  }

  // ----- services -----

  getParlayService(): ParlayService {
    if (!this.parlayService) {
      this.parlayService = new ParlayService()
    }
    return this.parlayService
  }

  // ----- utility methods -----

  /**
   * Clear all cached services (useful for testing)
   */
  clear(): void {
    this.parlayService = undefined
  }

  /**
   * Get all registered services (useful for debugging)
   */
  getRegisteredServices(): Record<string, boolean> {
    return {
      parlayService: !!this.parlayService,
    }
  }
}

/**
 * Convenience accessors if you prefer free functions over calling through the class.
 * These all resolve from the same underlying singleton container instance.
 */
export const getParlayService = (): ParlayService =>
  ServiceContainer.instance.getParlayService()

/**
 * Get the container instance directly
 */
export const getContainer = (): ServiceContainer => ServiceContainer.instance
