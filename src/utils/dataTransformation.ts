import {
  ESPNAthlete,
  ESPNEvent,
  ESPNScoreboardResponse,
  GameRosters,
  NFLGame,
  NFLPlayer,
} from '../types'
import { BaseProviderData } from '../types/providers'

// ESPN roster response structure
interface ESPNRosterData {
  athletes?: Array<{
    items?: ESPNAthlete[]
  }>
}

// Generic provider data structures
interface GenericCompetitor {
  homeAway?: string
  id?: string
  teamId?: string
  displayName?: string
  name?: string
  abbreviation?: string
  alias?: string
  city?: string
  conference?: string
  division?: string
  color?: string
  alternateColor?: string
  logo?: string
}

interface GenericTeam {
  id?: string
  teamId?: string
  displayName?: string
  name?: string
  abbreviation?: string
  alias?: string
  city?: string
  conference?: string
  division?: string
  color?: string
  alternateColor?: string
  logo?: string
}

interface GenericEvent {
  id?: string
  week?: number
  date?: string
  status?:
    | string
    | {
        type?: {
          id?: string
          name: string
          state?: string
          completed?: boolean
        }
      }
  score?: {
    home?: number
    away?: number
  }
  competitions?: Array<{
    competitors?: GenericCompetitor[]
  }>
  homeTeam?: GenericTeam
  awayTeam?: GenericTeam
}

interface GenericProviderData extends BaseProviderData {
  events?: GenericEvent[]
  games?: GenericEvent[]
  week?: {
    number?: number
  }
}

/**
 * Transform generic provider data to NFLGame format
 */
export function transformGamesResponse(data: BaseProviderData): NFLGame[] {
  const genericData = data as GenericProviderData
  // Try to access events array from the data
  const events = genericData.events || genericData.games || []

  if (!Array.isArray(events) || events.length === 0) {
    return []
  }

  return events.map((event: GenericEvent) => {
    // Handle different provider data structures
    const competition = event.competitions?.[0]
    const homeCompetitor =
      competition?.competitors?.find(
        (c: GenericCompetitor) => c.homeAway === 'home'
      ) || event.homeTeam
    const awayCompetitor =
      competition?.competitors?.find(
        (c: GenericCompetitor) => c.homeAway === 'away'
      ) || event.awayTeam

    if (!homeCompetitor || !awayCompetitor) {
      throw new Error(`Missing team data for game ${event.id || 'unknown'}`)
    }

    return {
      id: event.id || `${homeCompetitor.id}-${awayCompetitor.id}`,
      week: event.week || 1,
      season: new Date().getFullYear(),
      date: event.date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      homeTeam: {
        id: homeCompetitor.id || homeCompetitor.teamId || 'unknown-home',
        name:
          homeCompetitor.name || homeCompetitor.displayName || 'Unknown Team',
        displayName:
          homeCompetitor.displayName || homeCompetitor.name || 'Unknown Team',
        abbreviation:
          homeCompetitor.abbreviation || homeCompetitor.alias || 'UNK',
        city: homeCompetitor.city || '',
        conference: homeCompetitor.conference || 'NFC',
        division: homeCompetitor.division || '',
        color: homeCompetitor.color || '#000000',
        alternateColor: homeCompetitor.alternateColor || '#ffffff',
        logo: homeCompetitor.logo || '',
      },
      awayTeam: {
        id: awayCompetitor.id || awayCompetitor.teamId || 'unknown-away',
        name:
          awayCompetitor.name || awayCompetitor.displayName || 'Unknown Team',
        displayName:
          awayCompetitor.displayName || awayCompetitor.name || 'Unknown Team',
        abbreviation:
          awayCompetitor.abbreviation || awayCompetitor.alias || 'UNK',
        city: awayCompetitor.city || '',
        conference: awayCompetitor.conference || 'AFC',
        division: awayCompetitor.division || '',
        color: awayCompetitor.color || '#000000',
        alternateColor: awayCompetitor.alternateColor || '#ffffff',
        logo: awayCompetitor.logo || '',
      },
      status: (() => {
        if (typeof event.status === 'string') {
          return {
            type: {
              name: event.status,
              state: event.status === 'completed' ? 'post' : 'pre',
              completed: event.status === 'completed',
            },
          } as const
        }
        if (event.status && event.status.type) {
          return event.status as {
            type: {
              id?: string
              name: string
              state?: string
              completed?: boolean
            }
          }
        }
        return {
          type: {
            name: 'scheduled',
            state: 'pre',
            completed: false,
          },
        } as const
      })(),
      score: event.score
        ? {
            home: event.score.home || 0,
            away: event.score.away || 0,
          }
        : undefined,
    }
  })
}

/**
 * Transform ESPN API response to NFLGame format (legacy)
 */
export function transformESPNGamesResponse(
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
export function extractCurrentWeek(data: BaseProviderData): number {
  const genericData = data as GenericProviderData
  // Try to extract week from different provider data structures
  return genericData.week?.number || 1
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
export function transformAthleteToNFLPlayer(
  athlete: ESPNAthlete,
  teamId?: string
): NFLPlayer {
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
    team: {
      abbreviation: athlete.team?.abbreviation || 'UNK',
      displayName: athlete.team?.displayName || 'Unknown Team',
      id: athlete.team?.id || teamId || 'unknown',
    },
  }
}

/**
 * Transform ESPN roster response to GameRosters format
 */
export function transformRosterResponse(
  data: Record<string, unknown>,
  side: 'home' | 'away' = 'home'
): GameRosters {
  const rosterData = data as ESPNRosterData
  const athletes = rosterData?.athletes?.[0]?.items || []
  const players = athletes.map((athlete: ESPNAthlete) =>
    transformAthleteToNFLPlayer(athlete)
  )
  return side === 'home'
    ? {
        homeRoster: players,
        awayRoster: [],
      }
    : {
        homeRoster: [],
        awayRoster: players,
      }
}
