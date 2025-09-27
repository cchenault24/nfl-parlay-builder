import { INFLClient } from '../api/clients/base/interfaces'
import {
  ESPNAthlete,
  ESPNEvent,
  ESPNRosterResponse,
  ESPNScoreboardResponse,
  GameRosters,
  NFLGame,
  NFLPlayer,
} from '../types'

// Local interface specific to this service (not ESPN-related)
interface TeamInfo {
  id: string
  name?: string
  displayName?: string
  abbreviation?: string
  logo?: string
  color?: string
  alternateColor?: string
}

/**
 * NFL Data Service
 * Handles business logic for NFL data operations
 * Uses dependency injection for the NFL API client
 */
export class NFLDataService {
  constructor(private nflClient: INFLClient) {}

  /**
   * Get current week NFL games
   */
  async getCurrentWeekGames(): Promise<NFLGame[]> {
    const response = await this.nflClient.getCurrentWeekGames()
    return this.transformGamesResponse(response.data)
  }

  /**
   * Get games for a specific week
   */
  async getGamesByWeek(week: number): Promise<NFLGame[]> {
    const response = await this.nflClient.getGamesByWeek(week)
    return this.transformGamesResponse(response.data)
  }

  /**
   * Get current NFL week number
   */
  async getCurrentWeek(): Promise<number> {
    try {
      const response = await this.nflClient.getCurrentWeek()
      const data: ESPNScoreboardResponse = response.data

      if (data.week && data.week.number) {
        const apiWeek = data.week.number

        // Check if all games in the current week are finished
        // If so, advance to next week after Tuesday midnight local time
        const adjustedWeek = await this.getAdjustedWeekBasedOnCompletion(
          apiWeek,
          data.events || []
        )

        return adjustedWeek
      }

      // Fallback: estimate based on date if API doesn't provide week
      return this.estimateCurrentWeek()
    } catch {
      // Fallback to estimated week on error
      return this.estimateCurrentWeek()
    }
  }

  /**
   * Get available weeks for the current season
   */
  async getAvailableWeeks(): Promise<number[]> {
    const response = await this.nflClient.getAvailableWeeks()
    return response.data
  }

  /**
   * Get team roster
   */
  async getTeamRoster(teamId: string): Promise<NFLPlayer[]> {
    const response = await this.nflClient.getTeamRoster(teamId)
    return this.transformRosterResponse(response.data)
  }

  /**
   * Get rosters for both teams in a game
   * This is a business logic operation that combines multiple API calls
   */
  async getGameRosters(game: NFLGame): Promise<GameRosters> {
    try {
      const [homeRosterResponse, awayRosterResponse] = await Promise.all([
        this.nflClient.getTeamRoster(game.homeTeam.id),
        this.nflClient.getTeamRoster(game.awayTeam.id),
      ])

      return {
        homeRoster: this.transformRosterResponse(homeRosterResponse.data),
        awayRoster: this.transformRosterResponse(awayRosterResponse.data),
      }
    } catch (error) {
      console.error('Error fetching game rosters:', error)
      return { homeRoster: [], awayRoster: [] }
    }
  }

  /**
   * Get team with roster (combines team info + roster)
   * Example of business logic that combines multiple data sources
   */
  async getTeamWithRoster(
    teamId: string
  ): Promise<{ team: TeamInfo; roster: NFLPlayer[] }> {
    // In a real implementation, you might get team details from another endpoint
    // For now, we'll just get the roster
    const roster = await this.getTeamRoster(teamId)

    return {
      team: { id: teamId }, // Placeholder - could be enhanced
      roster,
    }
  }

  // Private helper methods for data transformation

  private transformGamesResponse(data: ESPNScoreboardResponse): NFLGame[] {
    if (!data.events || data.events.length === 0) {
      return []
    }

    return data.events.map((event: ESPNEvent) => {
      // ESPN API structure: event.competitions[0].competitors
      const competition = event.competitions?.[0]
      if (!competition) {
        throw new Error(`No competition data for event ${event.id}`)
      }

      const homeCompetitor = competition.competitors.find(
        c => c.homeAway === 'home'
      )
      const awayCompetitor = competition.competitors.find(
        c => c.homeAway === 'away'
      )

      if (!homeCompetitor || !awayCompetitor) {
        throw new Error(`Missing team data for game ${event.id}`)
      }

      // Create game object matching the new NFLGame interface with BaseEntity
      const game: NFLGame = {
        id: event.id,
        createdAt: new Date().toISOString(), // Required by BaseEntity
        updatedAt: new Date().toISOString(), // Optional in BaseEntity
        date: event.date,
        week: event.week?.number || data.week?.number || 1,
        season:
          event.season?.year || data.season?.year || new Date().getFullYear(),
        seasonType: 2, // Regular season (required by new type)
        // Map ESPN status to the new complex status structure
        status: {
          type: {
            id: event.status?.type?.name?.toLowerCase() || 'scheduled',
            name: event.status?.type?.name || 'Scheduled',
            state: this.mapGameStatusToState(event.status?.type?.name),
            completed: this.isGameCompleted(event.status?.type?.name),
          },
        },
        homeTeam: {
          id: homeCompetitor.team.id,
          name: homeCompetitor.team.name,
          displayName: homeCompetitor.team.displayName,
          shortDisplayName: homeCompetitor.team.displayName, // Required by new type
          abbreviation: homeCompetitor.team.abbreviation,
          color: homeCompetitor.team.color || '000000',
          alternateColor: homeCompetitor.team.alternateColor || '000000',
          logo: homeCompetitor.team.logo,
        },
        awayTeam: {
          id: awayCompetitor.team.id,
          name: awayCompetitor.team.name,
          displayName: awayCompetitor.team.displayName,
          shortDisplayName: awayCompetitor.team.displayName, // Required by new type
          abbreviation: awayCompetitor.team.abbreviation,
          color: awayCompetitor.team.color || '000000',
          alternateColor: awayCompetitor.team.alternateColor || '000000',
          logo: awayCompetitor.team.logo,
        },
      }

      return game
    })
  }

  public transformRosterResponse(data: ESPNRosterResponse): NFLPlayer[] {
    const rosterData = data as { athletes?: Array<{ items?: ESPNAthlete[] }> }
    if (!rosterData.athletes || rosterData.athletes.length === 0) {
      return []
    }

    // ESPN groups athletes by position, we need to flatten them
    const allAthletes: ESPNAthlete[] = rosterData.athletes.flatMap(
      group => group.items || []
    )

    return allAthletes.map((athlete: ESPNAthlete) => {
      const athleteData = athlete as {
        id: string
        displayName: string
        fullName?: string
        position?: { abbreviation?: string; name?: string }
        jersey?: string
        experience?: { years?: number }
        college?: { name?: string }
      }

      // Return object matching the new NFLPlayer interface
      return {
        id: athleteData.id,
        createdAt: new Date().toISOString(), // Required by BaseEntity
        updatedAt: new Date().toISOString(), // Optional in BaseEntity
        name: athleteData.displayName,
        displayName: athleteData.displayName,
        fullName: athleteData.fullName || athleteData.displayName,
        shortName: athleteData.displayName, // Required by new type
        // Position is now an object, not a string
        position: {
          name: athleteData.position?.name || 'Unknown',
          abbreviation:
            athleteData.position?.abbreviation ||
            athleteData.position?.name ||
            'N/A',
        },
        jerseyNumber: athleteData.jersey || '0', // Keep original property name
        experience: {
          years: athleteData.experience?.years || 0,
        },
        age: 25, // Default age since ESPN doesn't provide it
        status: {
          type: 'active', // Default status
        },
        college: athleteData.college?.name,
      }
    })
  }

  // Helper methods for the new status structure
  private mapGameStatusToState(statusName?: string): string {
    switch (statusName?.toLowerCase()) {
      case 'final':
      case 'final ot':
        return 'post'
      case 'in progress':
      case 'halftime':
      case '1st quarter':
      case '2nd quarter':
      case '3rd quarter':
      case '4th quarter':
      case 'overtime':
        return 'in'
      case 'postponed':
      case 'suspended':
        return 'post'
      default:
        return 'pre'
    }
  }

  private isGameCompleted(statusName?: string): boolean {
    switch (statusName?.toLowerCase()) {
      case 'final':
      case 'final ot':
        return true
      default:
        return false
    }
  }

  private estimateCurrentWeek(): number {
    // Simple estimation based on date
    // NFL season typically starts first week of September
    const now = new Date()
    const year = now.getFullYear()
    const seasonStart = new Date(year, 8, 1) // September 1st

    if (now < seasonStart) {
      return 1
    }

    const weeksElapsed = Math.floor(
      (now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
    )

    return Math.min(Math.max(weeksElapsed + 1, 1), 18)
  }

  private async getAdjustedWeekBasedOnCompletion(
    apiWeek: number,
    events: ESPNEvent[]
  ): Promise<number> {
    // Check if all games in the week are completed
    const allGamesComplete = events.every(
      event => event.status?.type?.name?.toLowerCase() === 'final'
    )

    if (!allGamesComplete) {
      return apiWeek
    }

    // If all games are complete, check if it's after Tuesday
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.

    // If it's Wednesday (3) or later, advance to next week
    if (dayOfWeek >= 3) {
      return Math.min(apiWeek + 1, 18)
    }

    return apiWeek
  }
}
