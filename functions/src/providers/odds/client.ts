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
  // Set only when the user asked for a book that had not posted this game and
  // another was used instead. Every leg is still anchored to a real posted
  // price — just not the requested book's — so the UI has to say whose it is
  // rather than quietly showing someone else's number.
  requestedBookmakerKey?: string
  spread: SpreadLine | null
  total: TotalLine | null
  moneyline: Moneyline | null
}

const ODDS_API = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl'
// Requested together in a single cached call, so letting a user pick among them
// costs no extra Odds API credits — the response already contains all four.
// Order is the fallback priority for anyone who has not chosen.
export const SUPPORTED_BOOKMAKERS = [
  { key: 'draftkings', title: 'DraftKings' },
  { key: 'fanduel', title: 'FanDuel' },
  { key: 'betmgm', title: 'BetMGM' },
  { key: 'caesars', title: 'Caesars' },
] as const

export type BookmakerKey = (typeof SUPPORTED_BOOKMAKERS)[number]['key']

const BOOKMAKERS = SUPPORTED_BOOKMAKERS.map(b => b.key)
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
  // Trimmed, because a secret set from a shell pipeline keeps whatever newline
  // the shell fed it, and Secret Manager stores the value byte for byte. The
  // stored ODDS_API_KEY carried a trailing \n, which the URL encodes as %0A —
  // so The Odds API answered 401 INVALID_KEY on every request the deployed
  // function ever made, while the same key worked from a terminal, where
  // command substitution had already eaten the newline. Trimming here fixes it
  // for every consumer of the key rather than only the one that noticed.
  const apiKey = process.env.ODDS_API_KEY?.trim()
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
        // The status alone is not diagnosable: The Odds API answers 401 for an
        // invalid key, an out-of-credits account and an unsupported parameter
        // alike, and only says which in the body. Carrying it through cost a
        // production debugging session to learn. The body echoes no credential.
        const detail = await res.text().catch(() => '')
        throw oddsError(
          'odds_request_failed',
          `The Odds API request failed: ${res.status}${detail ? ` — ${detail.slice(0, 300)}` : ''}`
        )
      }
      log.info('odds.fetched', {
        requestsRemaining: res.headers.get('x-requests-remaining'),
      })
      return (await res.json()) as OddsEvent[]
    },
    { ttlMs: CACHE_TTL_MS, skipFirestore: true }
  )
}

export async function getOddsForGame(
  game: ScheduleGame,
  preferredBookmaker?: string
): Promise<OddsSnapshot> {
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
  // A requested book wins outright when it posted this game. Otherwise fall
  // through the default priority — a parlay priced at another real book beats
  // no parlay, provided the swap is disclosed.
  const requested = preferredBookmaker
    ? event.bookmakers.find(b => b.key === preferredBookmaker)
    : undefined
  const book =
    requested ??
    BOOKMAKERS.map(key => event.bookmakers.find(b => b.key === key)).find(
      (b): b is Bookmaker => b !== undefined
    ) ??
    event.bookmakers[0]
  if (!book) {
    throw oddsError('odds_no_bookmaker', 'No bookmaker has posted lines')
  }
  const fellBack = !!preferredBookmaker && book.key !== preferredBookmaker

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
    ...(fellBack ? { requestedBookmakerKey: preferredBookmaker } : {}),
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
