import { Player } from '../entities/Player'

/**
 * PlayerRepository interface
 * Defines contract for player data operations
 */
export interface PlayerRepository {
  /**
   * Save a player
   */
  save(player: Player): Promise<void>

  /**
   * Find player by ID
   */
  findById(id: string): Promise<Player | null>

  /**
   * Find players by team
   */
  findByTeam(teamId: string): Promise<Player[]>

  /**
   * Find players by position
   */
  findByPosition(position: string): Promise<Player[]>

  /**
   * Find players by position group
   */
  findByPositionGroup(positionGroup: string): Promise<Player[]>

  /**
   * Find active players
   */
  findActive(): Promise<Player[]>

  /**
   * Find players by experience level
   */
  findByExperienceLevel(level: 'rookie' | 'young' | 'veteran' | 'elite'): Promise<Player[]>

  /**
   * Find players eligible for bet type
   */
  findEligibleForBetType(betType: string): Promise<Player[]>

  /**
   * Update player status
   */
  updateStatus(playerId: string, status: any): Promise<void>

  /**
   * Get player statistics
   */
  getStatistics(): Promise<{
    totalPlayers: number
    activePlayers: number
    positionDistribution: Record<string, number>
    experienceDistribution: Record<string, number>
  }>

  /**
   * Search players by criteria
   */
  search(criteria: {
    teamId?: string
    position?: string
    positionGroup?: string
    isActive?: boolean
    experienceLevel?: 'rookie' | 'young' | 'veteran' | 'elite'
    betType?: string
    limit?: number
    offset?: number
  }): Promise<Player[]>
}
