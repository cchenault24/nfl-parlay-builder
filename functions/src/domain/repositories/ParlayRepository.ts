import { Parlay } from '../entities/Parlay'

/**
 * ParlayRepository interface
 * Defines contract for parlay persistence operations
 */
export interface ParlayRepository {
  /**
   * Save a parlay
   */
  save(parlay: Parlay): Promise<void>

  /**
   * Find parlay by ID
   */
  findById(id: string): Promise<Parlay | null>

  /**
   * Find parlays by game ID
   */
  findByGameId(gameId: string): Promise<Parlay[]>

  /**
   * Find parlays by user ID
   */
  findByUserId(userId: string): Promise<Parlay[]>

  /**
   * Find parlays by date range
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<Parlay[]>

  /**
   * Find parlays by provider
   */
  findByProvider(provider: string): Promise<Parlay[]>

  /**
   * Find parlays by risk level
   */
  findByRiskLevel(riskLevel: 'low' | 'medium' | 'high'): Promise<Parlay[]>

  /**
   * Find parlays by confidence range
   */
  findByConfidenceRange(
    minConfidence: number,
    maxConfidence: number
  ): Promise<Parlay[]>

  /**
   * Update parlay
   */
  update(parlay: Parlay): Promise<void>

  /**
   * Delete parlay
   */
  delete(id: string): Promise<void>

  /**
   * Get parlay statistics
   */
  getStatistics(): Promise<{
    totalParlays: number
    averageConfidence: number
    riskLevelDistribution: Record<string, number>
    providerDistribution: Record<string, number>
    successRate: number
  }>

  /**
   * Get parlay history for a game
   */
  getGameHistory(gameId: string, limit?: number): Promise<Parlay[]>

  /**
   * Get recent parlays
   */
  getRecent(limit?: number): Promise<Parlay[]>

  /**
   * Search parlays by criteria
   */
  search(criteria: {
    gameId?: string
    userId?: string
    provider?: string
    riskLevel?: 'low' | 'medium' | 'high'
    minConfidence?: number
    maxConfidence?: number
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }): Promise<Parlay[]>
}
