import type { Request, Response } from 'express'
import { onRequest } from 'firebase-functions/v2/https'

// ESPN API response interfaces
interface ESPNTeam {
  id: string
  name?: string
  displayName: string
  shortDisplayName?: string
  abbreviation: string
  color?: string
  alternateColor?: string
  logo?: string
}

interface ESPNCompetitor {
  id: string
  homeAway: 'home' | 'away'
  team: ESPNTeam
  score?: {
    value: number
  }
}

interface ESPNVenue {
  id?: string
  fullName?: string
  shortName?: string
  city?: string
  state?: string
  indoor?: boolean
}

interface ESPNCompetition {
  id: string
  date: string
  competitors: ESPNCompetitor[]
  venue?: ESPNVenue
  status: {
    clock?: number
    displayClock?: string
    period?: number
    type: {
      id: string
      name: string
      state: string
      completed: boolean
      description: string
    }
  }
  broadcast?: Array<{
    market?: string
    names: string[]
  }>
}

interface ESPNEvent {
  id: string
  name?: string
  shortName?: string
  date: string
  competitions: ESPNCompetition[]
  status: {
    clock?: number
    displayClock?: string
    period?: number
    type: {
      id: string
      name: string
      state: string
      completed: boolean
      description: string
    }
  }
  week?: {
    number: number
  }
  season?: {
    year: number
    type?: number
  }
}

interface ESPNScoreboardResponse {
  events: ESPNEvent[]
  week?: {
    number: number
  }
  season?: {
    year: number
    type?: number
  }
}

// Our app's expected interfaces
interface NFLTeam {
  id: string
  abbreviation: string
  displayName: string
  shortDisplayName: string
  color?: string
  alternateColor?: string
  logo?: string
}

interface NFLGame {
  id: string
  season: number
  week: number
  date: string
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed'
  homeTeam: NFLTeam
  awayTeam: NFLTeam
  venue?: {
    id?: string
    name?: string
    city?: string
    state?: string
  }
}

/**
 * Map ESPN status to our simplified status format
 */
function mapGameStatus(espnStatus: ESPNEvent['status']): NFLGame['status'] {
  const state = espnStatus.type.state.toLowerCase()

  if (state === 'pre') return 'scheduled'
  if (state.includes('in') || state === 'halftime') return 'in_progress'
  if (state === 'post' || espnStatus.type.completed) return 'final'
  if (state.includes('postponed') || state.includes('delayed'))
    return 'postponed'

  return 'scheduled'
}

/**
 * Map ESPN team to our team format
 */
function mapTeam(espnTeam: ESPNTeam): NFLTeam {
  return {
    id: espnTeam.id,
    abbreviation: espnTeam.abbreviation,
    displayName: espnTeam.displayName,
    shortDisplayName: espnTeam.shortDisplayName || espnTeam.displayName,
    color: espnTeam.color,
    alternateColor: espnTeam.alternateColor,
    logo: espnTeam.logo,
  }
}

/**
 * Map ESPN event to our game format
 */
function mapGame(espnEvent: ESPNEvent): NFLGame {
  const competition = espnEvent.competitions[0]

  const homeCompetitor = competition.competitors.find(
    c => c.homeAway === 'home'
  )
  const awayCompetitor = competition.competitors.find(
    c => c.homeAway === 'away'
  )

  if (!homeCompetitor || !awayCompetitor) {
    throw new Error(
      `Invalid game data: missing home/away teams for game ${espnEvent.id}`
    )
  }

  return {
    id: espnEvent.id,
    season: espnEvent.season?.year || new Date().getFullYear(),
    week: espnEvent.week?.number || 1,
    date: espnEvent.date,
    status: mapGameStatus(espnEvent.status),
    homeTeam: mapTeam(homeCompetitor.team),
    awayTeam: mapTeam(awayCompetitor.team),
    venue: competition.venue
      ? {
          id: competition.venue.id,
          name: competition.venue.fullName || competition.venue.shortName,
          city: competition.venue.city,
          state: competition.venue.state,
        }
      : undefined,
  }
}

/**
 * Fetch games from ESPN API for a specific week
 */
async function getGamesFromESPN(week: number): Promise<NFLGame[]> {
  const currentYear = new Date().getFullYear()
  const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${week}&year=${currentYear}`

  try {
    console.log(
      `Fetching games from ESPN for week ${week}, year ${currentYear}`
    )

    const response = await fetch(espnUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'nfl-parlay-builder-server',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.error(`ESPN API error: ${response.status} ${response.statusText}`)
      throw new Error(
        `ESPN API returned ${response.status}: ${response.statusText}`
      )
    }

    const data: ESPNScoreboardResponse = await response.json()

    if (!data.events || data.events.length === 0) {
      console.warn(`No games found for week ${week}`)
      return []
    }

    console.log(`Found ${data.events.length} games for week ${week}`)

    // Map ESPN events to our game format
    const games = data.events.map(mapGame)

    return games
  } catch (error) {
    console.error(`Error fetching games for week ${week} from ESPN:`, error)
    throw error
  }
}

export const gamesByWeek = onRequest(
  {
    region: 'us-central1',
    cors: [
      'http://localhost:3001',
      'http://localhost:3000',
      'https://nfl-parlay-builder.web.app',
      'https://nfl-parlay-builder.firebaseapp.com',
    ],
  },
  async (req: Request, res: Response) => {
    const week = parseInt(req.query.week as string, 10)

    if (!week || week < 1 || week > 22) {
      res.status(400).json({
        success: false,
        error:
          'Invalid week parameter. Must be between 1 and 22 (includes playoffs).',
      })
      return
    }

    try {
      // Get games from ESPN API
      const games = await getGamesFromESPN(week)

      console.log(`Successfully fetched ${games.length} games for week ${week}`)

      res.status(200).json({
        success: true,
        data: games,
        week,
        source: 'espn',
        count: games.length,
      })
    } catch (error) {
      console.error(`Failed to get games for week ${week}:`, error)

      // Return empty array instead of mock data to indicate no games available
      // This is better UX than showing fake games
      res.status(200).json({
        success: true,
        data: [],
        week,
        source: 'fallback',
        error: error instanceof Error ? error.message : 'Unknown error',
        count: 0,
      })
    }
  }
)
