export type ESPNTeamRef = {
  id: string
  name: string
  displayName: string
  abbreviation: string
  logo?: string
  color?: string
  alternateColor?: string
}
export type ESPNTeamRecord = {
  name: string
  summary: string
  type: string
}

export type ESPNCompetitor = {
  homeAway: 'home' | 'away'
  team: ESPNTeamRef
  records?: ESPNTeamRecord[]
}

export type ESPNLeader = {
  displayValue: string
  value: number
  athlete?: { displayName: string }
}

export type ESPNLeaders = {
  name: string
  leaders: ESPNLeader[]
}
export type ESPNCompetition = {
  competitors: ESPNCompetitor[]
  venue?: { fullName?: string; address?: { city?: string; state?: string } }
  leaders?: ESPNLeaders[]
}
export type ESPNEventStatus = { type?: { name?: string } }
export type ESPNEvent = {
  id: string
  date: string
  competitions?: ESPNCompetition[]
  status?: ESPNEventStatus
  week?: { number?: number }
  season?: { year?: number }
}
export type ESPNScoreboardResponse = {
  events?: ESPNEvent[]
  week?: { number?: number }
  season?: { year?: number }
}

export type RosterPlayer = { playerId: string; name: string }

// ESPN API response types for roster
export type ESPNRosterAthlete = {
  id: string
  displayName: string
  fullName?: string
  name?: string
  position?: { displayName: string }
  athlete?: {
    id: string
    displayName: string
    fullName?: string
    name?: string
  }
}

export type ESPNRosterAthleteGroup = {
  items: ESPNRosterAthlete[]
}

export type ESPNRosterResponse = {
  athletes?: ESPNRosterAthleteGroup[]
}

// ESPN API response types for statistics
export type ESPNStatValue = {
  name: string
  value: number
}

export type ESPNTeamStatsResponse = {
  team: { id: string; displayName: string }
  season: { year: number }
  week: { number: number }
  stats: ESPNStatValue[]
}

export type ESPNPlayerStatsResponse = {
  athlete: {
    id: string
    displayName: string
    position: { displayName: string }
  }
  team: { id: string }
  season: { year: number }
  week: { number: number }
  stats: ESPNStatValue[]
}

// API response types for statistics endpoints
export type ESPNTeamStatsListResponse = {
  teams?: ESPNTeamStatsResponse[]
}

export type ESPNPlayerStatsListResponse = {
  players?: ESPNPlayerStatsResponse[]
}

// Enhanced types for statistics
export type ESPNTeamStats = {
  teamId: string
  teamName: string
  season: number
  week: number
  offensiveRankings: {
    totalYards: { rank: number; yardsPerGame: number }
    passingYards: { rank: number; yardsPerGame: number }
    rushingYards: { rank: number; yardsPerGame: number }
    pointsScored: { rank: number; pointsPerGame: number }
    thirdDownConversion: { rank: number; percentage: number }
    redZoneEfficiency: { rank: number; percentage: number }
  }
  defensiveRankings: {
    totalYardsAllowed: { rank: number; yardsPerGame: number }
    passingYardsAllowed: { rank: number; yardsPerGame: number }
    rushingYardsAllowed: { rank: number; yardsPerGame: number }
    pointsAllowed: { rank: number; pointsPerGame: number }
    turnovers: { rank: number; total: number }
    sacks: { rank: number; total: number }
  }
  homeStats: {
    week: number
    opponent: string
    homeAway: 'home' | 'away'
    result: 'win' | 'loss' | 'tie'
    score: { team: number; opponent: number }
    stats: {
      totalYards: number
      passingYards: number
      rushingYards: number
      points: number
      turnovers: number
      thirdDownConversions: number
      thirdDownAttempts: number
    }
  }
  awayStats: {
    week: number
    opponent: string
    homeAway: 'home' | 'away'
    result: 'win' | 'loss' | 'tie'
    score: { team: number; opponent: number }
    stats: {
      totalYards: number
      passingYards: number
      rushingYards: number
      points: number
      turnovers: number
      thirdDownConversions: number
      thirdDownAttempts: number
    }
  }
  recentGames: Array<{
    week: number
    opponent: string
    homeAway: 'home' | 'away'
    result: 'win' | 'loss' | 'tie'
    score: { team: number; opponent: number }
    stats: {
      totalYards: number
      passingYards: number
      rushingYards: number
      points: number
      turnovers: number
      thirdDownConversions: number
      thirdDownAttempts: number
    }
  }>
}

export type ESPNPlayerStats = {
  playerId: string
  playerName: string
  position: string
  teamId: string
  season: number
  week: number
  passing?: {
    yards: number
    attempts: number
    completions: number
    touchdowns: number
    interceptions: number
    completionPercentage: number
    yardsPerAttempt: number
    passerRating: number
  }
  rushing?: {
    yards: number
    attempts: number
    touchdowns: number
    yardsPerAttempt: number
    fumbles: number
  }
  receiving?: {
    yards: number
    receptions: number
    targets: number
    touchdowns: number
    yardsPerReception: number
    catchPercentage: number
  }
  recentGames: Array<{
    week: number
    opponent: string
    homeAway: 'home' | 'away'
    stats: Record<string, number>
  }>
}

export type GameItem = {
  gameId: string
  week: number
  startTime: string
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed'
  home: {
    teamId: string
    name: string
    abbrev: string
    record: string
    overallRecord: string
    homeRecord: string
    roadRecord: string
    stats: ESPNTeamStats | null
  }
  away: {
    teamId: string
    name: string
    abbrev: string
    record: string
    overallRecord: string
    homeRecord: string
    roadRecord: string
    stats: ESPNTeamStats | null
  }
  venue: { name: string; city: string; state: string }
  weather?: { condition: string; temperatureF: number; windMph: number }
  leaders?: {
    passing?: { name: string; stats: string; value: number }
    rushing?: { name: string; stats: string; value: number }
    receiving?: { name: string; stats: string; value: number }
  }
}

function mapStatus(
  name: string | undefined
): 'scheduled' | 'in_progress' | 'final' | 'postponed' {
  if (!name) {
    return 'scheduled'
  }
  const n = name.toLowerCase()
  if (n.includes('pre') || n.includes('scheduled')) {
    return 'scheduled'
  }
  if (n.includes('in') || n.includes('live')) {
    return 'in_progress'
  }
  if (n.includes('final') || n.includes('post')) {
    return 'final'
  }
  if (n.includes('postponed') || n.includes('delayed')) {
    return 'postponed'
  }
  return 'scheduled'
}

function extractTeamRecords(records: ESPNTeamRecord[]): {
  overall: string
  home: string
  road: string
} {
  const overall = records.find(r => r.name === 'overall')?.summary || '0-0'
  const home = records.find(r => r.name === 'Home')?.summary || '0-0'
  const road = records.find(r => r.name === 'Road')?.summary || '0-0'
  return { overall, home, road }
}

function extractLeaders(leaders: ESPNLeaders[]): GameItem['leaders'] {
  const passing = leaders.find(l => l.name === 'passingYards')?.leaders?.[0]
  const rushing = leaders.find(l => l.name === 'rushingYards')?.leaders?.[0]
  const receiving = leaders.find(l => l.name === 'receivingYards')?.leaders?.[0]

  return {
    passing: passing
      ? {
          name: passing.athlete?.displayName || 'Unknown',
          stats: passing.displayValue || '',
          value: passing.value || 0,
        }
      : undefined,
    rushing: rushing
      ? {
          name: rushing.athlete?.displayName || 'Unknown',
          stats: rushing.displayValue || '',
          value: rushing.value || 0,
        }
      : undefined,
    receiving: receiving
      ? {
          name: receiving.athlete?.displayName || 'Unknown',
          stats: receiving.displayValue || '',
          value: receiving.value || 0,
        }
      : undefined,
  }
}

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

export async function fetchCurrentWeek(): Promise<number> {
  const resp = await fetch(`${ESPN_BASE}/scoreboard`, {
    headers: {
      'User-Agent':
        'nfl-parlay-builder/1.0 (+https://nfl-parlay-builder.web.app)',
    },
  })
  if (!resp.ok) {
    console.error('ESPN fetchCurrentWeek failed', { status: resp.status })
    return 1
  }
  const data = (await resp.json()) as ESPNScoreboardResponse
  return data.week?.number ?? 1
}

export async function fetchGamesForWeek(
  week: number,
  includeStats: boolean = false
): Promise<GameItem[]> {
  const year = new Date().getFullYear()
  const url = `${ESPN_BASE}/scoreboard?seasontype=2&week=${encodeURIComponent(week)}&year=${encodeURIComponent(year)}`
  const resp = await fetch(url, {
    headers: {
      'User-Agent':
        'nfl-parlay-builder/1.0 (+https://nfl-parlay-builder.web.app)',
    },
  })
  if (!resp.ok) {
    console.error('ESPN fetchGamesForWeek failed', {
      week,
      status: resp.status,
    })
    return []
  }
  const data = (await resp.json()) as ESPNScoreboardResponse
  const events = Array.isArray(data.events) ? data.events : []

  // Fetch team statistics if requested
  let teamStatsMap: Map<string, ESPNTeamStats> = new Map()
  if (includeStats) {
    try {
      const allTeamStats = await fetchTeamStats(year)
      teamStatsMap = new Map(allTeamStats.map(stats => [stats.teamId, stats]))
    } catch (error) {
      console.error('Failed to fetch team stats for games:', error)
      // Continue without stats if fetching fails
    }
  }

  return events.map((event): GameItem => {
    const comp = event.competitions && event.competitions[0]
    const competitors = comp?.competitors ?? []
    const home = competitors.find(c => c.homeAway === 'home')
    const away = competitors.find(c => c.homeAway === 'away')
    const venueName = comp?.venue?.fullName ?? ''
    const venueCity = comp?.venue?.address?.city ?? ''
    const venueState = comp?.venue?.address?.state ?? ''

    // Extract team records
    const homeRecords = extractTeamRecords(home?.records || [])
    const awayRecords = extractTeamRecords(away?.records || [])

    // Extract game leaders
    const leaders = extractLeaders(comp?.leaders || [])

    if (!home || !away) {
      return {
        gameId: event.id,
        week: event.week?.number ?? data.week?.number ?? week,
        startTime: event.date,
        status: mapStatus(event.status?.type?.name),
        home: {
          teamId: 'unknown',
          name: 'Unknown',
          abbrev: 'UNK',
          record: '',
          overallRecord: '0-0',
          homeRecord: '0-0',
          roadRecord: '0-0',
          stats: null,
        },
        away: {
          teamId: 'unknown',
          name: 'Unknown',
          abbrev: 'UNK',
          record: '',
          overallRecord: '0-0',
          homeRecord: '0-0',
          roadRecord: '0-0',
          stats: null,
        },
        venue: { name: venueName, city: venueCity, state: venueState },
        leaders,
      }
    }
    return {
      gameId: event.id,
      week: event.week?.number ?? data.week?.number ?? week,
      startTime: event.date,
      status: mapStatus(event.status?.type?.name),
      home: {
        teamId: home.team.id,
        name: home.team.displayName || home.team.name,
        abbrev: home.team.abbreviation,
        record: homeRecords.overall,
        overallRecord: homeRecords.overall,
        homeRecord: homeRecords.home,
        roadRecord: homeRecords.road,
        stats: teamStatsMap.get(home.team.id) || null,
      },
      away: {
        teamId: away.team.id,
        name: away.team.displayName || away.team.name,
        abbrev: away.team.abbreviation,
        record: awayRecords.overall,
        overallRecord: awayRecords.overall,
        homeRecord: awayRecords.home,
        roadRecord: awayRecords.road,
        stats: teamStatsMap.get(away.team.id) || null,
      },
      venue: { name: venueName, city: venueCity, state: venueState },
      leaders,
    }
  })
}

/**
 * Fetch a team's roster (lightweight shape for AI context)
 */
export async function fetchTeamRoster(teamId: string): Promise<RosterPlayer[]> {
  const url = `${ESPN_BASE}/teams/${encodeURIComponent(teamId)}/roster`
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent':
          'nfl-parlay-builder/1.0 (+https://nfl-parlay-builder.web.app)',
      },
    })
    if (!resp.ok) {
      console.error('ESPN fetchTeamRoster failed', {
        teamId,
        status: resp.status,
      })
      return []
    }
    const data = (await resp.json()) as ESPNRosterResponse
    // ESPN roster payload structure can vary slightly; normalize robustly
    const athleteGroups: ESPNRosterAthleteGroup[] = Array.isArray(data.athletes)
      ? data.athletes
      : []
    const items: ESPNRosterAthlete[] = athleteGroups.flatMap(g =>
      Array.isArray(g.items) ? g.items : []
    )
    const players: RosterPlayer[] = items
      .map(item => {
        const athlete = item.athlete || item
        const playerId = String(athlete?.id || item?.id || '')
        const name =
          athlete?.displayName ||
          athlete?.fullName ||
          item?.fullName ||
          item?.name ||
          ''
        if (!playerId || !name) {
          return null
        }
        return { playerId, name }
      })
      .filter(Boolean) as RosterPlayer[]
    return players
  } catch {
    return []
  }
}

/**
 * Fetch team statistics for a specific season
 */
export async function fetchTeamStats(season: number): Promise<ESPNTeamStats[]> {
  try {
    const url = `${ESPN_BASE}/teams/statistics?season=${season}&seasontype=2`
    const resp = await fetch(url, {
      headers: {
        'User-Agent':
          'nfl-parlay-builder/1.0 (+https://nfl-parlay-builder.web.app)',
      },
    })
    if (!resp.ok) {
      console.error('ESPN fetchTeamStats failed', {
        season,
        status: resp.status,
      })
      return []
    }
    const data = (await resp.json()) as ESPNTeamStatsListResponse
    return data.teams?.map(transformESPNTeamStats) || []
  } catch (error) {
    console.error('Error fetching team stats:', error)
    return []
  }
}

/**
 * Fetch player statistics for a specific season
 */
export async function fetchPlayerStats(
  season: number
): Promise<ESPNPlayerStats[]> {
  try {
    const url = `${ESPN_BASE}/players/statistics?season=${season}&seasontype=2`
    const resp = await fetch(url, {
      headers: {
        'User-Agent':
          'nfl-parlay-builder/1.0 (+https://nfl-parlay-builder.web.app)',
      },
    })
    if (!resp.ok) {
      console.error('ESPN fetchPlayerStats failed', {
        season,
        status: resp.status,
      })
      return []
    }
    const data = (await resp.json()) as ESPNPlayerStatsListResponse
    return data.players?.map(transformESPNPlayerStats) || []
  } catch (error) {
    console.error('Error fetching player stats:', error)
    return []
  }
}

/**
 * Fetch team stats by team ID
 */
export async function fetchTeamStatsByTeam(
  teamId: string,
  season: number
): Promise<ESPNTeamStats | null> {
  try {
    const allStats = await fetchTeamStats(season)
    return allStats.find(team => team.teamId === teamId) || null
  } catch (error) {
    console.error(`Failed to fetch stats for team ${teamId}:`, error)
    return null
  }
}

/**
 * Fetch player stats by player ID
 */
export async function fetchPlayerStatsByPlayer(
  playerId: string,
  season: number
): Promise<ESPNPlayerStats | null> {
  try {
    const allStats = await fetchPlayerStats(season)
    return allStats.find(player => player.playerId === playerId) || null
  } catch (error) {
    console.error(`Failed to fetch stats for player ${playerId}:`, error)
    return null
  }
}

// Helper functions to transform ESPN API responses
function transformESPNTeamStats(
  teamData: ESPNTeamStatsResponse
): ESPNTeamStats {
  const team = teamData.team
  const stats = teamData.stats || []

  // Helper function to find stat by name
  const findStat = (name: string) => {
    const stat = stats.find((s: ESPNStatValue) => s.name === name)
    return stat ? stat.value : 0
  }

  // Calculate games played (assuming 17 games for now)
  const gamesPlayed = 17

  return {
    teamId: team.id,
    teamName: team.displayName,
    season: new Date().getFullYear(),
    week: 1, // ESPN doesn't provide week-specific team stats
    offensiveRankings: {
      totalYards: {
        rank: 1, // ESPN doesn't provide rankings, would need to calculate
        yardsPerGame: findStat('totalYards') / gamesPlayed,
      },
      passingYards: {
        rank: 1,
        yardsPerGame: findStat('passingYards') / gamesPlayed,
      },
      rushingYards: {
        rank: 1,
        yardsPerGame: findStat('rushingYards') / gamesPlayed,
      },
      pointsScored: {
        rank: 1,
        pointsPerGame: findStat('pointsFor') / gamesPlayed,
      },
      thirdDownConversion: {
        rank: 1,
        percentage:
          (findStat('thirdDownConversions') / findStat('thirdDownAttempts')) *
            100 || 0,
      },
      redZoneEfficiency: {
        rank: 1,
        percentage:
          (findStat('redZoneConversions') / findStat('redZoneAttempts')) *
            100 || 0,
      },
    },
    defensiveRankings: {
      totalYardsAllowed: {
        rank: 1,
        yardsPerGame: findStat('totalYardsAllowed') / gamesPlayed,
      },
      passingYardsAllowed: {
        rank: 1,
        yardsPerGame: findStat('passingYardsAllowed') / gamesPlayed,
      },
      rushingYardsAllowed: {
        rank: 1,
        yardsPerGame: findStat('rushingYardsAllowed') / gamesPlayed,
      },
      pointsAllowed: {
        rank: 1,
        pointsPerGame: findStat('pointsAgainst') / gamesPlayed,
      },
      turnovers: {
        rank: 1,
        total: findStat('takeaways'),
      },
      sacks: {
        rank: 1,
        total: findStat('sacks'),
      },
    },
    homeStats: {
      week: 1,
      opponent: 'Unknown',
      homeAway: 'home' as const,
      result: 'win' as const,
      score: { team: 0, opponent: 0 },
      stats: {
        totalYards: 0,
        passingYards: 0,
        rushingYards: 0,
        points: 0,
        turnovers: 0,
        thirdDownConversions: 0,
        thirdDownAttempts: 0,
      },
    },
    awayStats: {
      week: 1,
      opponent: 'Unknown',
      homeAway: 'away' as const,
      result: 'win' as const,
      score: { team: 0, opponent: 0 },
      stats: {
        totalYards: 0,
        passingYards: 0,
        rushingYards: 0,
        points: 0,
        turnovers: 0,
        thirdDownConversions: 0,
        thirdDownAttempts: 0,
      },
    },
    recentGames: [],
  }
}

function transformESPNPlayerStats(
  playerData: ESPNPlayerStatsResponse
): ESPNPlayerStats {
  const player = playerData.athlete
  const stats = playerData.stats || []

  // Helper function to find stat by name
  const findStat = (name: string) => {
    const stat = stats.find((s: ESPNStatValue) => s.name === name)
    return stat ? stat.value : 0
  }

  const passingYards = findStat('passingYards')
  const passingAttempts = findStat('passingAttempts')
  const passingCompletions = findStat('passingCompletions')
  const passingTouchdowns = findStat('passingTouchdowns')
  const passingInterceptions = findStat('passingInterceptions')

  const rushingYards = findStat('rushingYards')
  const rushingAttempts = findStat('rushingAttempts')
  const rushingTouchdowns = findStat('rushingTouchdowns')

  const receivingYards = findStat('receivingYards')
  const receptions = findStat('receptions')
  const receivingTargets = findStat('receivingTargets')
  const receivingTouchdowns = findStat('receivingTouchdowns')

  return {
    playerId: player.id,
    playerName: player.displayName,
    position: player.position?.displayName || 'Unknown',
    teamId: playerData.team.id,
    season: new Date().getFullYear(),
    week: 1,
    passing:
      passingAttempts > 0
        ? {
            yards: passingYards,
            attempts: passingAttempts,
            completions: passingCompletions,
            touchdowns: passingTouchdowns,
            interceptions: passingInterceptions,
            completionPercentage: (passingCompletions / passingAttempts) * 100,
            yardsPerAttempt: passingYards / passingAttempts,
            passerRating: calculatePasserRating(
              passingCompletions,
              passingAttempts,
              passingTouchdowns,
              passingInterceptions,
              passingYards
            ),
          }
        : undefined,
    rushing:
      rushingAttempts > 0
        ? {
            yards: rushingYards,
            attempts: rushingAttempts,
            touchdowns: rushingTouchdowns,
            yardsPerAttempt: rushingYards / rushingAttempts,
            fumbles: findStat('fumbles'),
          }
        : undefined,
    receiving:
      receivingTargets > 0
        ? {
            yards: receivingYards,
            receptions,
            targets: receivingTargets,
            touchdowns: receivingTouchdowns,
            yardsPerReception: receivingYards / receptions || 0,
            catchPercentage: (receptions / receivingTargets) * 100,
          }
        : undefined,
    recentGames: [],
  }
}

// Helper function to calculate passer rating
function calculatePasserRating(
  completions: number,
  attempts: number,
  touchdowns: number,
  interceptions: number,
  yards: number
): number {
  if (attempts === 0) {
    return 0
  }

  const a = (completions / attempts - 0.3) * 5
  const b = (yards / attempts - 3) * 0.25
  const c = (touchdowns / attempts) * 20
  const d = 2.375 - (interceptions / attempts) * 25

  const rating = ((a + b + c + d) / 6) * 100
  return Math.max(0, Math.min(158.3, rating))
}
