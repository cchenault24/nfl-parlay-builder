import { cache } from '../../cache/CacheClient'
import { log } from '../../observability/logger'
import { inc } from '../../observability/metrics'
import type {
  BoxScoreAthlete,
  GameBoxScore,
  GameStatus,
  LeagueAverages,
  PregameContext,
  RankedStat,
  RecentGame,
  ScheduleGame,
  TeamBoxScore,
  TeamInjury,
  TeamPregameContext,
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
      score?: string
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
    homeScore: home.score !== undefined ? parseInt(home.score, 10) : null,
    awayScore: away.score !== undefined ? parseInt(away.score, 10) : null,
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

type SummaryStatCategory = {
  name: string
  keys: string[]
  athletes: Array<{ athlete: { id: string; displayName: string }; stats: string[] }>
}
type SummaryTeamPlayers = { team: { id: string }; statistics: SummaryStatCategory[] }
type SummaryResponse = {
  header?: {
    competitions?: Array<{
      competitors?: Array<{ homeAway: 'home' | 'away'; team: { id: string } }>
    }>
  }
  boxscore?: { players?: SummaryTeamPlayers[] }
}

function toTeamBoxScore(entry: SummaryTeamPlayers): TeamBoxScore {
  const categories: Record<string, BoxScoreAthlete[]> = {}
  for (const category of entry.statistics) {
    categories[category.name] = category.athletes.map(a => ({
      id: a.athlete.id,
      name: a.athlete.displayName,
      stats: Object.fromEntries(
        category.keys.map((key, i) => [key, a.stats[i] ?? ''])
      ),
    }))
  }
  return { teamId: entry.team.id, categories }
}

// Only meaningful once a game is final; used solely for grading saved
// parlays, so it's cached for a full day rather than the 5-minute TTL
// everything else uses — a final result never changes.
export async function getBoxScore(gameId: string): Promise<GameBoxScore | null> {
  return cache.getOrSet(
    'espn_boxscore',
    { gameId },
    async () => {
      inc('provider_calls_espn_boxscore')
      const data = await fetchJson<SummaryResponse>(
        `${SITE}/summary?event=${gameId}`,
        10_000
      )
      const players = data.boxscore?.players
      const competitors = data.header?.competitions?.[0]?.competitors
      if (!players || players.length < 2 || !competitors) {
        return null
      }
      const homeTeamId = competitors.find(c => c.homeAway === 'home')?.team.id
      const awayTeamId = competitors.find(c => c.homeAway === 'away')?.team.id
      const home = players.find(p => p.team.id === homeTeamId)
      const away = players.find(p => p.team.id === awayTeamId)
      if (!home || !away) {
        return null
      }
      return { home: toTeamBoxScore(home), away: toTeamBoxScore(away) }
    },
    { ttlMs: 24 * 60 * 60 * 1000 }
  )
}

type SummaryInjuryEntry = {
  team: { id: string }
  injuries: Array<{
    status: string
    athlete: { displayName: string; position?: { abbreviation: string } }
    details?: { type?: string; detail?: string }
  }>
}
type SummaryLastFiveGames = {
  team: { id: string }
  events: Array<{
    week: number
    gameDate: string
    homeTeamId: string
    homeTeamScore: string
    awayTeamScore: string
    gameResult: string
    opponent: { displayName: string }
  }>
}
type PregameSummaryResponse = SummaryResponse & {
  injuries?: SummaryInjuryEntry[]
  lastFiveGames?: SummaryLastFiveGames[]
}

function toTeamInjuries(entry: SummaryInjuryEntry | undefined): TeamInjury[] {
  return (entry?.injuries ?? []).map(i => ({
    player: i.athlete.displayName,
    position: i.athlete.position?.abbreviation ?? '',
    status: i.status,
    detail: [i.details?.type, i.details?.detail].filter(Boolean).join(' - '),
  }))
}

function toRecentGames(entry: SummaryLastFiveGames | undefined): RecentGame[] {
  if (!entry) {
    return []
  }
  return entry.events
    .map(e => {
      const isHome = e.homeTeamId === entry.team.id
      const pointsFor = parseInt(isHome ? e.homeTeamScore : e.awayTeamScore, 10)
      const pointsAgainst = parseInt(isHome ? e.awayTeamScore : e.homeTeamScore, 10)
      return {
        week: e.week,
        opponent: e.opponent.displayName,
        pointsFor,
        pointsAgainst,
        result: e.gameResult,
        dateTime: e.gameDate,
      }
    })
    .sort((a, b) => b.dateTime.localeCompare(a.dateTime))
}

// Injury reports and each team's last five results — available before
// kickoff, unlike the box score. Cached briefly since injury designations
// can change day-to-day in the lead-up to a game.
export async function getPregameContext(
  gameId: string,
  homeTeamId: string,
  awayTeamId: string
): Promise<PregameContext | null> {
  return cache.getOrSet(
    'espn_pregame',
    { gameId },
    async () => {
      inc('provider_calls_espn_pregame')
      const data = await fetchJson<PregameSummaryResponse>(
        `${SITE}/summary?event=${gameId}`,
        10_000
      )
      const toTeamContext = (teamId: string): TeamPregameContext => ({
        injuries: toTeamInjuries(data.injuries?.find(i => i.team.id === teamId)),
        recentGames: toRecentGames(
          data.lastFiveGames?.find(g => g.team.id === teamId)
        ),
      })
      return {
        home: toTeamContext(homeTeamId),
        away: toTeamContext(awayTeamId),
      }
    },
    { ttlMs: 1_800_000 }
  )
}

// League-wide scoring average for the given season, used to give an
// individual team's points-per-game some scale. Falls back to the prior
// season before any games have been played, same as team stats.
export async function getLeagueAverages(
  season: number
): Promise<LeagueAverages | null> {
  const scoreFinalGames = (games: ScheduleGame[]) =>
    games.filter(
      (g): g is ScheduleGame & { homeScore: number; awayScore: number } =>
        g.status === 'final' && g.homeScore !== null && g.awayScore !== null
    )

  let games = scoreFinalGames(await getSeasonSchedule(season))
  let usedSeason = season
  if (games.length === 0) {
    games = scoreFinalGames(await getSeasonSchedule(season - 1))
    usedSeason = season - 1
  }
  if (games.length === 0) {
    return null
  }
  const totalPoints = games.reduce((sum, g) => sum + g.homeScore + g.awayScore, 0)
  return {
    season: usedSeason,
    avgTotalPoints: Math.round((totalPoints / games.length) * 10) / 10,
    avgPointsPerTeam: Math.round((totalPoints / games.length / 2) * 10) / 10,
  }
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
