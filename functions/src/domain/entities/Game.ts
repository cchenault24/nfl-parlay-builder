import { BaseEntity } from './BaseEntity'
import { Team } from './Team'

export interface GameStatus {
  type: {
    id: string
    name: string
    state: string
    completed: boolean
  }
}

/**
 * NFL Game domain entity
 * Contains business logic for game-related operations
 */
export class Game extends BaseEntity {
  public readonly week: number
  public readonly seasonType: number
  public readonly homeTeam: Team
  public readonly awayTeam: Team
  public readonly date: Date
  public readonly status: GameStatus

  constructor(
    id: string,
    week: number,
    seasonType: number,
    homeTeam: Team,
    awayTeam: Team,
    date: Date,
    status: GameStatus,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, createdAt, updatedAt)
    this.week = week
    this.seasonType = seasonType
    this.homeTeam = homeTeam
    this.awayTeam = awayTeam
    this.date = date
    this.status = status
  }

  /**
   * Validate the game entity
   */
  public validate(): boolean {
    return (
      !!this.id &&
      this.week > 0 &&
      this.week <= 18 &&
      this.seasonType > 0 &&
      this.homeTeam.validate() &&
      this.awayTeam.validate() &&
      this.date instanceof Date &&
      !!this.status
    )
  }

  /**
   * Check if game is completed
   */
  public isCompleted(): boolean {
    return this.status.type.completed
  }

  /**
   * Check if game is scheduled
   */
  public isScheduled(): boolean {
    return this.status.type.state === 'pre' && !this.isCompleted()
  }

  /**
   * Check if game is in progress
   */
  public isInProgress(): boolean {
    return this.status.type.state === 'in' && !this.isCompleted()
  }

  /**
   * Check if game is postponed
   */
  public isPostponed(): boolean {
    return this.status.type.state === 'postponed'
  }

  /**
   * Get game matchup string
   */
  public getMatchup(): string {
    return `${this.awayTeam.displayName} @ ${this.homeTeam.displayName}`
  }

  /**
   * Get short matchup string
   */
  public getShortMatchup(): string {
    return `${this.awayTeam.abbreviation} @ ${this.homeTeam.abbreviation}`
  }

  /**
   * Check if game is a divisional matchup
   */
  public isDivisionalMatchup(): boolean {
    return (
      this.homeTeam.getDivision() === this.awayTeam.getDivision() &&
      this.homeTeam.getDivision() !== 'Unknown'
    )
  }

  /**
   * Check if game is a conference matchup
   */
  public isConferenceMatchup(): boolean {
    return (
      this.homeTeam.getConference() === this.awayTeam.getConference() &&
      this.homeTeam.getConference() !== 'Unknown'
    )
  }

  /**
   * Check if game is a cross-conference matchup
   */
  public isCrossConferenceMatchup(): boolean {
    return (
      this.homeTeam.getConference() !== this.awayTeam.getConference() &&
      this.homeTeam.getConference() !== 'Unknown' &&
      this.awayTeam.getConference() !== 'Unknown'
    )
  }

  /**
   * Get time until game starts (in hours)
   */
  public getHoursUntilStart(): number {
    const now = new Date()
    const diffMs = this.date.getTime() - now.getTime()
    return Math.max(0, diffMs / (1000 * 60 * 60))
  }

  /**
   * Check if game starts within specified hours
   */
  public startsWithinHours(hours: number): boolean {
    return this.getHoursUntilStart() <= hours && this.getHoursUntilStart() > 0
  }

  /**
   * Get game context for AI analysis
   */
  public getGameContext(): {
    matchup: string
    isDivisional: boolean
    isConference: boolean
    isCrossConference: boolean
    timeUntilStart: number
    status: string
  } {
    return {
      matchup: this.getMatchup(),
      isDivisional: this.isDivisionalMatchup(),
      isConference: this.isConferenceMatchup(),
      isCrossConference: this.isCrossConferenceMatchup(),
      timeUntilStart: this.getHoursUntilStart(),
      status: this.status.type.state,
    }
  }

  /**
   * Create a copy of the game with updated status
   */
  public withStatus(newStatus: GameStatus): Game {
    return new Game(
      this.id,
      this.week,
      this.seasonType,
      this.homeTeam,
      this.awayTeam,
      this.date,
      newStatus,
      this.createdAt,
      new Date()
    )
  }
}
