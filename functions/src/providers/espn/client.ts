import { cache } from '../../cache/CacheClient'
import { log } from '../../observability/logger'
import { inc } from '../../observability/metrics'
import type {
  GameStatus,
  RankedStat,
  ScheduleGame,
  TeamRef,
  TeamStats,
} from './types'

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'
const CORE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl'
const REGULAR_SEASON = 2
const CACHE_TTL_MS = 300_000

async function fetchJson<T>(url: string, timeoutMs = 8_000): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) {
    throw new Error(`ESPN request failed: ${res.status} ${url}`)
  }
  return (await res.json()) as T
}

type ScoreboardEvent = {
  id: string
  date: string
  season: { year: number; type: number }
  week: { number: number }
  status: { type: { name: string; state: 'pre' | 'in' | 'post' } }
  weather?: { displayValue: string; temperature: number }
  competitions: Array<{
    neutralSite: boolean
    venue?: {
      fullName: string
      address?: { city?: string; state?: string }
      indoor?: boolean
    }
    competitors: Array<{
      homeAway: 'home' | 'away'
      team: { id: string; abbreviation: string; displayName: string }
      records?: Array<{ type: string; summary: string }>
    }>
  }>
}

type StatCategory = {
  name: string
  stats: Array<{ name: string; value: number; rank?: number }>
}

function toStatus(event: ScoreboardEvent): GameStatus {
  const { name, state } = event.status.type
  if (name === 'STATUS_POSTPONED' || name === 'STATUS_CANCELED') {
    return 'postponed'
  }
  if (state === 'in') {
    return 'in_progress'
  }
  return state === 'post' ? 'final' : 'scheduled'
}

function toTeamRef(
  competitor: ScoreboardEvent['competitions'][number]['competitors'][number]
): TeamRef {
  const record = (type: string) =>
    competitor.records?.find(r => r.type === type)?.summary ?? '0-0'
  return {
    teamId: competitor.team.id,
    abbrev: competitor.team.abbreviation,
    name: competitor.team.displayName,
    record: record('total'),
    homeRecord: record('home'),
    roadRecord: record('road'),
  }
}

function toScheduleGame(event: ScoreboardEvent): ScheduleGame | null {
  const competition = event.competitions[0]
  const home = competition?.competitors.find(c => c.homeAway === 'home')
  const away = competition?.competitors.find(c => c.homeAway === 'away')
  if (!competition || !home || !away) {
    return null
  }
  const venue = competition.venue
  return {
    gameId: event.id,
    season: event.season.year,
    week: event.week.number,
    dateTime: event.date,
    status: toStatus(event),
    neutralSite: competition.neutralSite,
    home: toTeamRef(home),
    away: toTeamRef(away),
    venue: venue
      ? {
          name: venue.fullName,
          city: venue.address?.city ?? '',
          state: venue.address?.state ?? '',
          indoor: venue.indoor ?? false,
        }
      : null,
    weather: event.weather
      ? {
          condition: event.weather.displayValue,
          temperatureF: event.weather.temperature,
        }
      : null,
  }
}

export async function getSeasonSchedule(
  season: number
): Promise<ScheduleGame[]> {
  return cache.getOrSet(
    'espn_schedule',
    { season },
    async () => {
      inc('provider_calls_espn_schedule')
      const url = `${SITE}/scoreboard?dates=${season}0801-${season + 1}0301&seasontype=${REGULAR_SEASON}&limit=1000`
      const data = await fetchJson<{ events?: ScoreboardEvent[] }>(url, 15_000)
      const games = (data.events ?? [])
        .filter(e => e.season.type === REGULAR_SEASON)
        .map(toScheduleGame)
        .filter((g): g is ScheduleGame => g !== null)
        .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
      log.info('espn.schedule.loaded', { season, games: games.length })
      return games
    },
    { ttlMs: CACHE_TTL_MS }
  )
}

export async function getGame(
  season: number,
  gameId: string
): Promise<ScheduleGame | null> {
  const games = await getSeasonSchedule(season)
  return games.find(g => g.gameId === gameId) ?? null
}

function pickStat(
  categories: StatCategory[],
  category: string,
  name: string
): RankedStat {
  const stat = categories
    .find(c => c.name === category)
    ?.stats.find(s => s.name === name)
  if (!stat) {
    throw new Error(`ESPN stat missing: ${category}.${name}`)
  }
  return { value: stat.value, rank: stat.rank ?? 0 }
}

function meanRank(stats: RankedStat[]): number {
  const ranked = stats.filter(s => s.rank > 0)
  if (ranked.length === 0) {
    return 0
  }
  return Math.round(ranked.reduce((sum, s) => sum + s.rank, 0) / ranked.length)
}

// Returns null when the season has no games yet: the core feed reports zeros
// and the site feed 404s, so there is nothing real to show.
async function fetchTeamStats(
  teamId: string,
  season: number
): Promise<TeamStats | null> {
  const own = await fetchJson<{ splits: { categories: StatCategory[] } }>(
    `${CORE}/seasons/${season}/types/${REGULAR_SEASON}/teams/${teamId}/statistics`
  )
  const ownCats = own.splits.categories
  const gamesPlayed = pickStat(ownCats, 'passing', 'teamGamesPlayed').value
  if (gamesPlayed === 0) {
    return null
  }
  const site = await fetchJson<{
    team: { displayName: string }
    results: { opponent: StatCategory[] }
  }>(`${SITE}/teams/${teamId}/statistics?season=${season}`)
  const oppCats = site.results.opponent

  const offense = {
    totalYardsPerGame: pickStat(ownCats, 'passing', 'yardsPerGame'),
    passingYardsPerGame: pickStat(ownCats, 'passing', 'netPassingYardsPerGame'),
    rushingYardsPerGame: pickStat(ownCats, 'rushing', 'rushingYardsPerGame'),
    pointsPerGame: pickStat(ownCats, 'scoring', 'totalPointsPerGame'),
  }
  const defense = {
    yardsAllowedPerGame: pickStat(oppCats, 'passing', 'yardsPerGame'),
    passingYardsAllowedPerGame: pickStat(
      oppCats,
      'passing',
      'netPassingYardsPerGame'
    ),
    rushingYardsAllowedPerGame: pickStat(
      oppCats,
      'rushing',
      'rushingYardsPerGame'
    ),
    pointsAllowedPerGame: pickStat(oppCats, 'scoring', 'totalPointsPerGame'),
    takeaways: pickStat(ownCats, 'miscellaneous', 'totalTakeaways'),
  }
  const overallOffenseRank = meanRank(Object.values(offense))
  const overallDefenseRank = meanRank(Object.values(defense))

  return {
    teamId,
    teamName: site.team.displayName,
    season,
    gamesPlayed,
    offense,
    defense,
    overallOffenseRank,
    overallDefenseRank,
    overallRank: meanRank([
      { value: 0, rank: overallOffenseRank },
      { value: 0, rank: overallDefenseRank },
    ]),
  }
}

// Before a team has played, the prior season is the only real sample.
export async function getTeamStats(
  teamId: string,
  season: number
): Promise<TeamStats> {
  return cache.getOrSet(
    'espn_team_stats',
    { teamId, season },
    async () => {
      inc('provider_calls_espn_team_stats')
      const stats =
        (await fetchTeamStats(teamId, season)) ??
        (await fetchTeamStats(teamId, season - 1))
      if (!stats) {
        throw new Error(`No statistics available for team ${teamId}`)
      }
      return stats
    },
    { ttlMs: CACHE_TTL_MS }
  )
}
