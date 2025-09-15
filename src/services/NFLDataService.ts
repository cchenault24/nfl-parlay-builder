import { INFLClient } from '../api/clients/base/interfaces'
import { GameRosters, NFLGame, NFLPlayer } from '../types'

// ESPN API response types (based on your existing code)
interface ESPNCompetitor {
  id: string
  homeAway: 'home' | 'away'
  team: {
    id: string
    name: string
    displayName: string
    abbreviation: string
    color?: string
    alternateColor?: string
    logo: string
  }
}

interface ESPNCompetition {
  id: string
  competitors: ESPNCompetitor[]
}

interface ESPNEvent {
  id: string
  date: string
  competitions: ESPNCompetition[]
  week?: {
    number: number
  }
  season?: {
    year: number
  }
  status?: {
    type: {
      name: string
    }
  }
}

interface ESPNScoreboardResponse {
  events: ESPNEvent[]
  week?: {
    number: number
  }
  season?: {
    year: number
  }
}

interface ESPNAthlete {
  id: string
  displayName: string
  fullName?: string
  position?: {
    name: string
    abbreviation: string
  }
  jersey?: string
  experience?: {
    years: number
  }
  college?: {
    name: string
  }
}

interface ESPNRosterResponse {
  athletes: Array<{
    position?: string
    items: ESPNAthlete[]
  }>
}

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

      const game: NFLGame = {
        id: event.id,
        date: event.date,
        week: event.week?.number || data.week?.number || 1,
        season:
          event.season?.year || data.season?.year || new Date().getFullYear(),
        status: this.mapGameStatus(event.status?.type?.name),
        homeTeam: {
          id: homeCompetitor.team.id,
          name: homeCompetitor.team.name,
          displayName: homeCompetitor.team.displayName,
          abbreviation: homeCompetitor.team.abbreviation,
          color: homeCompetitor.team.color || '000000',
          alternateColor: homeCompetitor.team.alternateColor || '000000',
          logo: homeCompetitor.team.logo,
        },
        awayTeam: {
          id: awayCompetitor.team.id,
          name: awayCompetitor.team.name,
          displayName: awayCompetitor.team.displayName,
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
        position?: { abbreviation?: string; name?: string }
        jersey?: string
        experience?: { years?: number }
        college?: { name?: string }
      }

      return {
        id: athleteData.id,
        name: athleteData.displayName,
        displayName: athleteData.displayName,
        position:
          athleteData.position?.abbreviation ||
          athleteData.position?.name ||
          'N/A',
        jerseyNumber: athleteData.jersey || '0',
        experience: athleteData.experience?.years || 0,
        college: athleteData.college?.name,
      }
    })
  }

  private mapGameStatus(statusName?: string): NFLGame['status'] {
    if (!statusName) {
      return 'scheduled'
    }

    const status = statusName.toLowerCase()
    if (status.includes('final')) {
      return 'final'
    }
    if (status.includes('progress') || status.includes('live')) {
      return 'in_progress'
    }
    if (status.includes('postponed') || status.includes('delayed')) {
      return 'postponed'
    }
    return 'scheduled'
  }

  private async getAdjustedWeekBasedOnCompletion(
    apiWeek: number,
    events: ESPNEvent[]
  ): Promise<number> {
    // Check if all games in the current week are finished
    const allGamesFinished = events.every(event =>
      event.status?.type?.name?.toLowerCase().includes('final')
    )

    if (allGamesFinished) {
      // Check if it's after Tuesday midnight (when new week typically starts)
      const now = new Date()
      const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, 2 = Tuesday
      const hour = now.getHours()

      // If it's Wednesday (3) or later, or Tuesday (2) after midnight, advance week
      if (dayOfWeek >= 3 || (dayOfWeek === 2 && hour >= 0)) {
        return Math.min(apiWeek + 1, 18) // Cap at week 18
      }
    }

    return apiWeek
  }

  private estimateCurrentWeek(): number {
    // Rough estimation based on date (NFL season typically starts in September)
    const now = new Date()
    const year = now.getFullYear()

    // Estimate NFL season start (first Tuesday of September)
    const seasonStart = new Date(year, 8, 1) // September 1st
    const firstTuesday = new Date(seasonStart)
    firstTuesday.setDate(1 + ((9 - seasonStart.getDay()) % 7))

    // Calculate weeks since season start
    const weeksSinceStart = Math.floor(
      (now.getTime() - firstTuesday.getTime()) / (7 * 24 * 60 * 60 * 1000)
    )

    return Math.max(1, Math.min(weeksSinceStart + 1, 18))
  }
}
