import { cache } from '../../cache/CacheClient'
import { log } from '../../observability/logger'
import { inc } from '../../observability/metrics'
import type { ScheduleGame } from '../espn/types'

export interface SpreadLine {
  line: number
  homePrice: number
  awayPrice: number
}

export interface TotalLine {
  line: number
  overPrice: number
  underPrice: number
}

export interface Moneyline {
  home: number
  away: number
}

export interface OddsSnapshot {
  eventId: string
  bookmaker: string
  bookmakerKey: string
  lastUpdate: string
  spread: SpreadLine | null
  total: TotalLine | null
  moneyline: Moneyline | null
}

const ODDS_API = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl'
const BOOKMAKERS = ['draftkings', 'fanduel', 'betmgm', 'caesars']
const CACHE_TTL_MS = 60_000
const KICKOFF_TOLERANCE_MS = 6 * 60 * 60 * 1000

type Outcome = { name: string; price: number; point?: number }
type Market = { key: string; outcomes: Outcome[] }
type Bookmaker = {
  key: string
  title: string
  last_update: string
  markets: Market[]
}
type OddsEvent = {
  id: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers: Bookmaker[]
}

function oddsError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code })
}

// One call covers every NFL game; cached so a burst of runs costs one credit per market.
async function fetchNflOdds(): Promise<OddsEvent[]> {
  const apiKey = process.env.ODDS_API_KEY
  if (!apiKey) {
    throw oddsError('odds_not_configured', 'ODDS_API_KEY is not configured')
  }
  return cache.getOrSet(
    'odds_nfl',
    {},
    async () => {
      inc('provider_calls_odds')
      const url = new URL(`${ODDS_API}/odds`)
      url.searchParams.set('apiKey', apiKey)
      url.searchParams.set('markets', 'h2h,spreads,totals')
      url.searchParams.set('oddsFormat', 'american')
      url.searchParams.set('bookmakers', BOOKMAKERS.join(','))
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
      if (!res.ok) {
        throw oddsError(
          'odds_request_failed',
          `The Odds API request failed: ${res.status}`
        )
      }
      log.info('odds.fetched', {
        requestsRemaining: res.headers.get('x-requests-remaining'),
      })
      return (await res.json()) as OddsEvent[]
    },
    { ttlMs: CACHE_TTL_MS }
  )
}

export async function getOddsForGame(game: ScheduleGame): Promise<OddsSnapshot> {
  const events = await fetchNflOdds()
  const kickoff = Date.parse(game.dateTime)
  const event = events.find(
    e =>
      e.home_team === game.home.name &&
      e.away_team === game.away.name &&
      Math.abs(Date.parse(e.commence_time) - kickoff) <= KICKOFF_TOLERANCE_MS
  )
  if (!event) {
    throw oddsError(
      'odds_not_found',
      `No lines listed yet for ${game.away.name} @ ${game.home.name}`
    )
  }
  const book =
    BOOKMAKERS.map(key => event.bookmakers.find(b => b.key === key)).find(
      (b): b is Bookmaker => b !== undefined
    ) ?? event.bookmakers[0]
  if (!book) {
    throw oddsError('odds_no_bookmaker', 'No bookmaker has posted lines')
  }

  const market = (key: string) => book.markets.find(m => m.key === key)
  const outcome = (m: Market | undefined, name: string) =>
    m?.outcomes.find(o => o.name === name)

  const spreadHome = outcome(market('spreads'), game.home.name)
  const spreadAway = outcome(market('spreads'), game.away.name)
  const over = outcome(market('totals'), 'Over')
  const under = outcome(market('totals'), 'Under')
  const mlHome = outcome(market('h2h'), game.home.name)
  const mlAway = outcome(market('h2h'), game.away.name)

  return {
    eventId: event.id,
    bookmaker: book.title,
    bookmakerKey: book.key,
    lastUpdate: book.last_update,
    spread:
      spreadHome?.point !== undefined && spreadAway
        ? {
            line: spreadHome.point,
            homePrice: spreadHome.price,
            awayPrice: spreadAway.price,
          }
        : null,
    total:
      over?.point !== undefined && under
        ? { line: over.point, overPrice: over.price, underPrice: under.price }
        : null,
    moneyline: mlHome && mlAway ? { home: mlHome.price, away: mlAway.price } : null,
  }
}
