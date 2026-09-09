import { cache } from '../../cache/CacheClient'
import { inc } from '../../observability/metrics'
import type { TeamEpa, TeamEpaStats } from './types'

const WEEK_CSV = (season: number) =>
  `https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_${season}.csv`

const CACHE_TTL_MS = 6 * 60 * 60 * 1000

// nflverse spells two franchises differently; every other abbreviation
// matches ESPN's verbatim.
const ESPN_TO_NFLVERSE: Record<string, string> = { LAR: 'LA', WSH: 'WAS' }

const REQUIRED_COLUMNS = [
  'season_type',
  'team',
  'week',
  'opponent_team',
  'attempts',
  'carries',
  'sacks_suffered',
  'passing_epa',
  'rushing_epa',
] as const

interface TeamWeek {
  team: string
  week: number
  opponent: string
  offEpa: number
  plays: number
}

// Blank and "NA" mean the category had no plays that week, so zero is the
// right contribution rather than a gap to paper over.
function num(value: string | undefined): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function parseWeeklyRows(csv: string): TeamWeek[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) {return []}
  const header = lines[0].split(',')
  const at = Object.fromEntries(
    REQUIRED_COLUMNS.map(name => [name, header.indexOf(name)])
  ) as Record<(typeof REQUIRED_COLUMNS)[number], number>

  const missing = REQUIRED_COLUMNS.filter(name => at[name] === -1)
  if (missing.length > 0) {
    // Surface schema drift instead of silently aggregating zeros.
    throw new Error(`nflverse CSV missing columns: ${missing.join(', ')}`)
  }

  const rows: TeamWeek[] = []
  for (const line of lines.slice(1)) {
    const cells = line.split(',')
    if (cells[at.season_type] !== 'REG') {continue}
    rows.push({
      team: cells[at.team],
      week: num(cells[at.week]),
      opponent: cells[at.opponent_team],
      offEpa: num(cells[at.passing_epa]) + num(cells[at.rushing_epa]),
      // Sacks are plays that passing_epa already accounts for, but they are
      // not counted in `attempts`.
      plays:
        num(cells[at.attempts]) +
        num(cells[at.carries]) +
        num(cells[at.sacks_suffered]),
    })
  }
  return rows
}

// Empty when the season's file has not been published yet — that is the
// normal state before a season's first games, not a failure.
async function fetchSeasonRows(season: number): Promise<TeamWeek[]> {
  const res = await fetch(WEEK_CSV(season), { signal: AbortSignal.timeout(10_000) })
  if (res.status === 404) {return []}
  if (!res.ok) {
    throw new Error(`nflverse request failed: ${res.status} ${WEEK_CSV(season)}`)
  }
  return parseWeeklyRows(await res.text())
}

function loadSeasonRows(season: number): Promise<TeamWeek[]> {
  return cache.getOrSet(
    'nflverse_epa',
    { season },
    async () => {
      inc('provider_calls_nflverse_epa')
      return fetchSeasonRows(season)
    },
    { ttlMs: CACHE_TTL_MS }
  )
}

function perPlay(rows: TeamWeek[]): number | null {
  const plays = rows.reduce((sum, r) => sum + r.plays, 0)
  if (plays === 0) {return null}
  const epa = rows.reduce((sum, r) => sum + r.offEpa, 0)
  return Math.round((epa / plays) * 1000) / 1000
}

function aggregate(rows: TeamWeek[], team: string): TeamEpa | null {
  // Most recent first, so the last-3 window is just a slice.
  const own = rows.filter(r => r.team === team).sort((a, b) => b.week - a.week)
  if (own.length === 0) {return null}

  // What this team's defense gave up is its opponents' own offensive line
  // for those same games.
  const faced = own.flatMap(game =>
    rows.filter(r => r.team === game.opponent && r.week === game.week)
  )

  const offEpaPerPlay = perPlay(own)
  const defEpaPerPlayAllowed = perPlay(faced)
  if (offEpaPerPlay === null || defEpaPerPlayAllowed === null) {return null}

  return {
    offEpaPerPlay,
    defEpaPerPlayAllowed,
    offEpaPerPlayLast3: own.length >= 3 ? perPlay(own.slice(0, 3)) : null,
    plays: own.reduce((sum, r) => sum + r.plays, 0),
    games: own.length,
  }
}

// EPA efficiency for both sides of a matchup. Falls back to the prior season
// before the current one has any regular-season games, same as team stats.
export async function getTeamEpa(
  homeAbbrev: string,
  awayAbbrev: string,
  season: number
): Promise<TeamEpaStats | null> {
  let usedSeason = season
  let rows = await loadSeasonRows(season)
  if (rows.length === 0) {
    usedSeason = season - 1
    rows = await loadSeasonRows(usedSeason)
  }
  if (rows.length === 0) {return null}

  const code = (abbrev: string) => ESPN_TO_NFLVERSE[abbrev] ?? abbrev
  const home = aggregate(rows, code(homeAbbrev))
  const away = aggregate(rows, code(awayAbbrev))
  if (!home || !away) {return null}

  return { season: usedSeason, home, away }
}
