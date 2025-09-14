/**
 * Updated Service Container for Dependency Injection
 * Removes OpenAI client dependency since we now use Cloud Functions
 */
import { ESPNClient } from '../api'
import { NFLDataService } from './NFLDataService'
import { ParlayService } from './ParlayService'

/**
 * Service container that creates and manages service instances
 * This implements a simple dependency injection pattern
 */
export class ServiceContainer {
  private static instance: ServiceContainer
  private services: Map<string, any> = new Map()

  private constructor() {}

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer()
    }
    return ServiceContainer.instance
  }

  /**
   * Get or create NFL Data Service with ESPN Client dependency
   */
  getNFLDataService(): NFLDataService {
    const key = 'NFLDataService'

    if (!this.services.has(key)) {
      const espnClient = this.getESPNClient()
      const service = new NFLDataService(espnClient)
      this.services.set(key, service)
    }

    return this.services.get(key)
  }

  /**
   * Get or create Parlay Service with NFL Client dependency
   * Note: No longer requires OpenAI client since we use Cloud Functions
   */
  getParlayService(): ParlayService {
    const key = 'ParlayService'

    if (!this.services.has(key)) {
      const nflClient = this.getESPNClient()
      const nflDataService = this.getNFLDataService()
      const service = new ParlayService(nflClient, nflDataService) // Only 2 parameters now
      this.services.set(key, service)
    }

    return this.services.get(key)
  }

  /**
   * Get or create ESPN Client
   */
  getESPNClient(): ESPNClient {
    const key = 'ESPNClient'

    if (!this.services.has(key)) {
      const client = new ESPNClient()
      this.services.set(key, client)
    }

    return this.services.get(key)
  }

  /**
   * Clear all cached services (useful for testing)
   */
  clear(): void {
    this.services.clear()
  }

  /**
   * Register a custom service instance (useful for testing with mocks)
   */
  register<T>(key: string, service: T): void {
    this.services.set(key, service)
  }
}

// Convenience function to get the container instance
export const getContainer = () => ServiceContainer.getInstance()

// Convenience functions for getting specific services
export const getNFLDataService = () => getContainer().getNFLDataService()
export const getESPNClient = () => getContainer().getESPNClient()
export const getParlayService = () => getContainer().getParlayService()

// Note: Removed getOpenAIClient since it's no longer needed
// If any other parts of your code import getOpenAIClient, you'll need to update them
