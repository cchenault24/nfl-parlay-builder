import { BaseEntity } from './BaseEntity'

/**
 * NFL Team domain entity
 * Contains business logic for team-related operations
 */
export class Team extends BaseEntity {
  public readonly abbreviation: string
  public readonly displayName: string
  public readonly shortDisplayName: string
  public readonly color: string
  public readonly alternateColor: string
  public readonly logo: string

  constructor(
    id: string,
    abbreviation: string,
    displayName: string,
    shortDisplayName: string,
    color: string,
    alternateColor: string,
    logo: string,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, createdAt, updatedAt)
    this.abbreviation = abbreviation
    this.displayName = displayName
    this.shortDisplayName = shortDisplayName
    this.color = color
    this.alternateColor = alternateColor
    this.logo = logo
  }

  /**
   * Validate the team entity
   */
  public validate(): boolean {
    return (
      !!this.id &&
      !!this.abbreviation &&
      !!this.displayName &&
      !!this.color &&
      !!this.alternateColor &&
      !!this.logo
    )
  }

  /**
   * Get team's conference based on abbreviation
   */
  public getConference(): 'AFC' | 'NFC' | 'Unknown' {
    const afcTeams = [
      'BUF',
      'MIA',
      'NE',
      'NYJ',
      'BAL',
      'CIN',
      'CLE',
      'PIT',
      'HOU',
      'IND',
      'JAX',
      'TEN',
      'DEN',
      'KC',
      'LV',
      'LAC',
    ]
    const nfcTeams = [
      'DAL',
      'NYG',
      'PHI',
      'WAS',
      'CHI',
      'DET',
      'GB',
      'MIN',
      'ATL',
      'CAR',
      'NO',
      'TB',
      'ARI',
      'LAR',
      'SF',
      'SEA',
    ]

    if (afcTeams.includes(this.abbreviation)) return 'AFC'
    if (nfcTeams.includes(this.abbreviation)) return 'NFC'
    return 'Unknown'
  }

  /**
   * Get team's division based on abbreviation
   */
  public getDivision(): string {
    const divisions = {
      'AFC East': ['BUF', 'MIA', 'NE', 'NYJ'],
      'AFC North': ['BAL', 'CIN', 'CLE', 'PIT'],
      'AFC South': ['HOU', 'IND', 'JAX', 'TEN'],
      'AFC West': ['DEN', 'KC', 'LV', 'LAC'],
      'NFC East': ['DAL', 'NYG', 'PHI', 'WAS'],
      'NFC North': ['CHI', 'DET', 'GB', 'MIN'],
      'NFC South': ['ATL', 'CAR', 'NO', 'TB'],
      'NFC West': ['ARI', 'LAR', 'SF', 'SEA'],
    }

    for (const [division, teams] of Object.entries(divisions)) {
      if (teams.includes(this.abbreviation)) {
        return division
      }
    }
    return 'Unknown'
  }

  /**
   * Check if this is a home team for a given game
   */
  public isHomeTeam(game: Game): boolean {
    return game.homeTeam.equals(this)
  }

  /**
   * Check if this is an away team for a given game
   */
  public isAwayTeam(game: Game): boolean {
    return game.awayTeam.equals(this)
  }

  /**
   * Get team's primary color for display
   */
  public getPrimaryColor(): string {
    return this.color
  }

  /**
   * Get team's secondary color for display
   */
  public getSecondaryColor(): string {
    return this.alternateColor
  }
}

// Forward declaration for Game (circular dependency)
declare class Game {
  homeTeam: Team
  awayTeam: Team
}
