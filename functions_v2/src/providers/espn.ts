export type ESPNTeamRef = {
  id: string
  name: string
  displayName: string
  abbreviation: string
  logo?: string
  color?: string
  alternateColor?: string
}
export type ESPNCompetitor = {
  homeAway: 'home' | 'away'
  team: ESPNTeamRef
  records?: Array<{ name: string; summary: string; type: string }>
}
export type ESPNCompetition = {
  competitors: ESPNCompetitor[]
  venue?: { fullName?: string; address?: { city?: string; state?: string } }
  leaders?: Array<{
    name: string
    leaders: Array<{
      displayValue: string
      value: number
      athlete?: { displayName: string }
    }>
  }>
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
  }
  away: {
    teamId: string
    name: string
    abbrev: string
    record: string
    overallRecord: string
    homeRecord: string
    roadRecord: string
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

function extractTeamRecords(records: any[]): {
  overall: string
  home: string
  road: string
} {
  const overall = records.find(r => r.name === 'overall')?.summary || '0-0'
  const home = records.find(r => r.name === 'Home')?.summary || '0-0'
  const road = records.find(r => r.name === 'Road')?.summary || '0-0'
  return { overall, home, road }
}

function extractLeaders(leaders: any[]): GameItem['leaders'] {
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

export async function fetchGamesForWeek(week: number): Promise<GameItem[]> {
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
        },
        away: {
          teamId: 'unknown',
          name: 'Unknown',
          abbrev: 'UNK',
          record: '',
          overallRecord: '0-0',
          homeRecord: '0-0',
          roadRecord: '0-0',
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
      },
      away: {
        teamId: away.team.id,
        name: away.team.displayName || away.team.name,
        abbrev: away.team.abbreviation,
        record: awayRecords.overall,
        overallRecord: awayRecords.overall,
        homeRecord: awayRecords.home,
        roadRecord: awayRecords.road,
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
    const data = (await resp.json()) as any
    // ESPN roster payload structure can vary slightly; normalize robustly
    const athleteGroups: any[] = Array.isArray(data.athletes)
      ? data.athletes
      : []
    const items: any[] = athleteGroups.flatMap(g =>
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
