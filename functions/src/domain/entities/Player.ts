import { BaseEntity } from './BaseEntity'

export interface PlayerPosition {
  abbreviation: string
  displayName: string
}

export interface PlayerExperience {
  years: number
}

export interface PlayerStatus {
  type: string
  isActive: boolean
}

/**
 * NFL Player domain entity
 * Contains business logic for player-related operations
 */
export class Player extends BaseEntity {
  public readonly fullName: string
  public readonly displayName: string
  public readonly shortName: string
  public readonly position: PlayerPosition
  public readonly jersey: string
  public readonly experience: PlayerExperience
  public readonly age: number
  public readonly status: PlayerStatus

  constructor(
    id: string,
    fullName: string,
    displayName: string,
    shortName: string,
    position: PlayerPosition,
    jersey: string,
    experience: PlayerExperience,
    age: number,
    status: PlayerStatus,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, createdAt, updatedAt)
    this.fullName = fullName
    this.displayName = displayName
    this.shortName = shortName
    this.position = position
    this.jersey = jersey
    this.experience = experience
    this.age = age
    this.status = status
  }

  /**
   * Validate the player entity
   */
  public validate(): boolean {
    return (
      !!this.id &&
      !!this.fullName &&
      !!this.displayName &&
      !!this.position.abbreviation &&
      !!this.jersey &&
      this.age > 0 &&
      this.experience.years >= 0
    )
  }

  /**
   * Check if player is active
   */
  public isActive(): boolean {
    return this.status.isActive
  }

  /**
   * Check if player is a rookie
   */
  public isRookie(): boolean {
    return this.experience.years === 0
  }

  /**
   * Check if player is a veteran (5+ years)
   */
  public isVeteran(): boolean {
    return this.experience.years >= 5
  }

  /**
   * Get player's position group
   */
  public getPositionGroup(): string {
    const pos = this.position.abbreviation.toUpperCase()
    if (['QB'].includes(pos)) return 'quarterback'
    if (['RB', 'FB'].includes(pos)) return 'running_back'
    if (['WR', 'TE'].includes(pos)) return 'receiver'
    if (['OL', 'OT', 'OG', 'C'].includes(pos)) return 'offensive_line'
    if (['DL', 'DE', 'DT', 'NT'].includes(pos)) return 'defensive_line'
    if (['LB', 'OLB', 'ILB'].includes(pos)) return 'linebacker'
    if (['CB', 'S', 'FS', 'SS'].includes(pos)) return 'secondary'
    if (['K', 'P', 'LS'].includes(pos)) return 'special_teams'
    return 'other'
  }

  /**
   * Check if player is eligible for specific bet types
   */
  public isEligibleForBetType(betType: string): boolean {
    const pos = this.position.abbreviation.toUpperCase()

    switch (betType) {
      case 'player_passing':
        return pos === 'QB'
      case 'player_rushing':
        return ['QB', 'RB', 'FB'].includes(pos)
      case 'player_receiving':
        return ['WR', 'TE', 'RB', 'FB'].includes(pos)
      case 'first_touchdown':
        return ['RB', 'WR', 'TE', 'QB'].includes(pos)
      case 'defensive_props':
        return ['DE', 'DT', 'LB', 'CB', 'S'].includes(pos)
      case 'kicking_props':
        return pos === 'K'
      default:
        return false
    }
  }

  /**
   * Get player's experience tier
   */
  public getExperienceTier(): 'rookie' | 'young' | 'veteran' | 'elite' {
    if (this.experience.years === 0) return 'rookie'
    if (this.experience.years <= 3) return 'young'
    if (this.experience.years <= 8) return 'veteran'
    return 'elite'
  }

  /**
   * Create a copy of the player with updated status
   */
  public withStatus(newStatus: PlayerStatus): Player {
    return new Player(
      this.id,
      this.fullName,
      this.displayName,
      this.shortName,
      this.position,
      this.jersey,
      this.experience,
      this.age,
      newStatus,
      this.createdAt,
      new Date()
    )
  }
}
