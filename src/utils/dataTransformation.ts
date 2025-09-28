import {
  ESPNAthlete,
  ESPNEvent,
  ESPNScoreboardResponse,
  GameRosters,
  NFLGame,
  NFLPlayer,
} from '../types'

/**
 * Transform ESPN API response to NFLGame format
 */
export function transformGamesResponse(
  data: ESPNScoreboardResponse
): NFLGame[] {
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
          state: mapGameStatusToState(event.status?.type?.name),
          completed: isGameCompleted(event.status?.type?.name),
        },
      },
      homeTeam: {
        id: homeCompetitor.team.id,
        name: homeCompetitor.team.name,
        displayName: homeCompetitor.team.displayName,
        abbreviation: homeCompetitor.team.abbreviation,
        color: homeCompetitor.team.color || '#000000',
        alternateColor: homeCompetitor.team.alternateColor || '#ffffff',
        logo: homeCompetitor.team.logo,
      },
      awayTeam: {
        id: awayCompetitor.team.id,
        name: awayCompetitor.team.name,
        displayName: awayCompetitor.team.displayName,
        abbreviation: awayCompetitor.team.abbreviation,
        color: awayCompetitor.team.color || '#000000',
        alternateColor: awayCompetitor.team.alternateColor || '#ffffff',
        logo: awayCompetitor.team.logo,
      },
    }

    return game
  })
}

/**
 * Map ESPN game status to internal state
 */
function mapGameStatusToState(status?: string): 'pre' | 'in' | 'post' {
  if (!status) {
    return 'pre'
  }

  const statusLower = status.toLowerCase()
  if (statusLower.includes('in') || statusLower.includes('live')) {
    return 'in'
  }
  if (statusLower.includes('post') || statusLower.includes('final')) {
    return 'post'
  }
  return 'pre'
}

/**
 * Check if game is completed
 */
function isGameCompleted(status?: string): boolean {
  if (!status) {
    return false
  }

  const statusLower = status.toLowerCase()
  return statusLower.includes('post') || statusLower.includes('final')
}

/**
 * Extract current week from ESPN response
 */
export function extractCurrentWeek(data: ESPNScoreboardResponse): number {
  return data.week?.number || 1
}

/**
 * Extract available weeks from ESPN response
 */
export function extractAvailableWeeks(_data: ESPNScoreboardResponse): number[] {
  // For now, return weeks 1-18 as ESPN doesn't provide this directly
  // In a real implementation, you might need to make multiple API calls
  return Array.from({ length: 18 }, (_, i) => i + 1)
}

/**
 * Transform ESPN athlete data to NFLPlayer format
 */
export function transformAthleteToNFLPlayer(athlete: ESPNAthlete): NFLPlayer {
  return {
    id: athlete.id,
    name: athlete.fullName || athlete.displayName,
    displayName: athlete.displayName,
    fullName: athlete.fullName,
    shortName: athlete.displayName,
    position: {
      name: athlete.position?.name || 'Unknown',
      abbreviation: athlete.position?.abbreviation || 'UNK',
    },
    jerseyNumber: athlete.jersey || '0',
    experience: {
      years: athlete.experience?.years || 0,
    },
    age: undefined,
    college: athlete.college?.name,
    status: {
      type: 'active',
    },
  }
}

/**
 * Transform ESPN roster response to GameRosters format
 */
export function transformRosterResponse(data: any): GameRosters {
  const athletes = data?.athletes?.[0]?.items || []
  return {
    homeRoster: athletes.map(transformAthleteToNFLPlayer),
    awayRoster: [], // Will be populated separately
  }
}
