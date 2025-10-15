import { AgentParlayService } from './AgentParlayService'
import { BaseParlayService } from './BaseParlayService'
import { MockParlayService } from './MockParlayService'

/**
 * Centralized dependency container with lazy singletons.
 * - All getters are safe to call repeatedly.
 * - You can override instances for tests using the register methods.
 */
export class ServiceContainer {
  private static _instance: ServiceContainer | undefined

  // Cached singletons
  private mockParlayService?: MockParlayService
  private agentParlayService?: AgentParlayService

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

  registerMockParlayService(instance: MockParlayService): void {
    this.mockParlayService = instance
  }

  registerAgentParlayService(instance: AgentParlayService): void {
    this.agentParlayService = instance
  }

  // ----- services -----

  getMockParlayService(): MockParlayService {
    if (!this.mockParlayService) {
      this.mockParlayService = new MockParlayService()
    }
    return this.mockParlayService
  }

  getAgentParlayService(): AgentParlayService {
    if (!this.agentParlayService) {
      this.agentParlayService = new AgentParlayService()
    }
    return this.agentParlayService
  }

  /**
   * Get the appropriate parlay service based on provider
   */
  getParlayService(provider: 'mock' | 'agent' = 'agent'): BaseParlayService {
    if (provider === 'mock') {
      return this.getMockParlayService()
    }
    return this.getAgentParlayService()
  }

  // ----- utility methods -----

  /**
   * Clear all cached services (useful for testing)
   */
  clear(): void {
    this.mockParlayService = undefined
    this.agentParlayService = undefined
  }

  /**
   * Get all registered services (useful for debugging)
   */
  getRegisteredServices(): Record<string, boolean> {
    return {
      mockParlayService: !!this.mockParlayService,
      agentParlayService: !!this.agentParlayService,
    }
  }
}

/**
 * Convenience accessors if you prefer free functions over calling through the class.
 * These all resolve from the same underlying singleton container instance.
 */
export const getParlayService = (
  provider: 'mock' | 'agent' = 'agent'
): BaseParlayService => ServiceContainer.instance.getParlayService(provider)

/**
 * Get the container instance directly
 */
export const getContainer = (): ServiceContainer => ServiceContainer.instance
