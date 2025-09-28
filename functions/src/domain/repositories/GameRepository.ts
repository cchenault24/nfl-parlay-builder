import { Game } from '../entities/Game'
import { Player } from '../entities/Player'

/**
 * GameRepository interface
 * Defines contract for game data operations
 */
export interface GameRepository {
  /**
   * Save a game
   */
  save(game: Game): Promise<void>

  /**
   * Find game by ID
   */
  findById(id: string): Promise<Game | null>

  /**
   * Find games by week
   */
  findByWeek(week: number): Promise<Game[]>

  /**
   * Find games by season type
   */
  findBySeasonType(seasonType: number): Promise<Game[]>

  /**
   * Find games by team
   */
  findByTeam(teamId: string): Promise<Game[]>

  /**
   * Find games by date range
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<Game[]>

  /**
   * Find upcoming games
   */
  findUpcoming(limit?: number): Promise<Game[]>

  /**
   * Find completed games
   */
  findCompleted(limit?: number): Promise<Game[]>

  /**
   * Find games in progress
   */
  findInProgress(): Promise<Game[]>

  /**
   * Update game status
   */
  updateStatus(gameId: string, status: any): Promise<void>

  /**
   * Get game statistics
   */
  getStatistics(): Promise<{
    totalGames: number
    completedGames: number
    upcomingGames: number
    inProgressGames: number
    averageGamesPerWeek: number
  }>

  /**
   * Get team schedule
   */
  getTeamSchedule(teamId: string, seasonType?: number): Promise<Game[]>

  /**
   * Get divisional matchups
   */
  getDivisionalMatchups(week: number): Promise<Game[]>

  /**
   * Get conference matchups
   */
  getConferenceMatchups(week: number): Promise<Game[]>

  /**
   * Get cross-conference matchups
   */
  getCrossConferenceMatchups(week: number): Promise<Game[]>
}

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
  findByExperienceLevel(
    level: 'rookie' | 'young' | 'veteran' | 'elite'
  ): Promise<Player[]>

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
