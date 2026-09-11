import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cache } from '../../cache/CacheClient'
import { makeGame, makeSecondGame } from '../../testing/fixtures'
import { getOddsForGame, getWeekOdds, SUPPORTED_BOOKMAKERS } from './client'

// The Firestore tier of the cache is stubbed out: this is about the request
// collapsing and the 60s window, not about where the entry is stored.
vi.mock('../../utils/cache', () => ({
  getCached: async () => null,
  setCached: async () => undefined,
}))

const GAME = makeGame()
const OTHER = makeSecondGame()

function book(key: string, title: string, markets: unknown[]) {
  return { key, title, last_update: '2026-10-10T12:00:00Z', markets }
}

function spreadsAndTotals(home: string, away: string) {
  return [
    {
      key: 'spreads',
      outcomes: [
        { name: home, price: -110, point: -3.5 },
        { name: away, price: -110, point: 3.5 },
      ],
    },
    {
      key: 'totals',
      outcomes: [
        { name: 'Over', price: -108, point: 44.5 },
        { name: 'Under', price: -112, point: 44.5 },
      ],
    },
    {
      key: 'h2h',
      outcomes: [
        { name: home, price: -185 },
        { name: away, price: 155 },
      ],
    },
  ]
}

// DraftKings and FanDuel have posted the first game; only FanDuel has posted the
// second; nobody lists BetMGM or Caesars.
const PAYLOAD = [
  {
    id: 'evt-1',
    commence_time: GAME.dateTime,
    home_team: GAME.home.name,
    away_team: GAME.away.name,
    bookmakers: [
      book('draftkings', 'DraftKings', spreadsAndTotals(GAME.home.name, GAME.away.name)),
      book('fanduel', 'FanDuel', spreadsAndTotals(GAME.home.name, GAME.away.name)),
      // Present in the response but with no market this app prices.
      book('betmgm', 'BetMGM', []),
    ],
  },
  {
    id: 'evt-2',
    commence_time: OTHER.dateTime,
    home_team: OTHER.home.name,
    away_team: OTHER.away.name,
    bookmakers: [
      book('fanduel', 'FanDuel', spreadsAndTotals(OTHER.home.name, OTHER.away.name)),
    ],
  },
]

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  cache.clearMemory()
  process.env.ODDS_API_KEY = 'test-key'
  fetchMock = vi.fn(async () => ({
    ok: true,
    headers: { get: () => '480' },
    json: async () => PAYLOAD,
  }))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.ODDS_API_KEY
})

describe('getWeekOdds', () => {
  it('returns every supported book for every game, posted or not', async () => {
    const result = await getWeekOdds([GAME, OTHER])

    expect(result.games.map(g => g.gameId)).toEqual([GAME.gameId, OTHER.gameId])
    for (const game of result.games) {
      expect(game.books.map(b => b.key)).toEqual(SUPPORTED_BOOKMAKERS.map(b => b.key))
    }
  })

  it('marks a book that has posted nothing as not posted', async () => {
    const [first, second] = (await getWeekOdds([GAME, OTHER])).games
    const posted = (g: typeof first) =>
      Object.fromEntries(g.books.map(b => [b.key, b.posted]))

    expect(posted(first)).toEqual({
      draftkings: true,
      fanduel: true,
      // Listed by the provider, but with no spread, total or moneyline.
      betmgm: false,
      caesars: false,
    })
    expect(posted(second)).toEqual({
      draftkings: false,
      fanduel: true,
      betmgm: false,
      caesars: false,
    })
  })

  it('carries the lines through for a book that has posted', async () => {
    const [first] = (await getWeekOdds([GAME])).games
    expect(first.books.find(b => b.key === 'draftkings')).toMatchObject({
      title: 'DraftKings',
      posted: true,
      spread: { line: -3.5, homePrice: -110, awayPrice: -110 },
      total: { line: 44.5, overPrice: -108, underPrice: -112 },
      moneyline: { home: -185, away: 155 },
    })
  })

  it('leaves an unposted book with null markets rather than omitting it', async () => {
    const [first] = (await getWeekOdds([GAME])).games
    expect(first.books.find(b => b.key === 'caesars')).toMatchObject({
      posted: false,
      spread: null,
      total: null,
      moneyline: null,
      lastUpdate: null,
    })
  })

  it('reports a game nobody has posted with four unposted books', async () => {
    const unlisted = makeGame({ gameId: 'g-unlisted', dateTime: '2026-10-12T20:00:00Z' })
    const [only] = (await getWeekOdds([unlisted])).games
    expect(only.books.every(b => !b.posted)).toBe(true)
  })
})

describe('slate caching', () => {
  it('spends one upstream request for a whole week of games', async () => {
    await getWeekOdds([GAME, OTHER])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('serves a second read inside the window without fetching again', async () => {
    await getWeekOdds([GAME])
    await getWeekOdds([OTHER])
    await getOddsForGame(GAME)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('fetches again once the window has passed', async () => {
    vi.useFakeTimers()
    try {
      await getWeekOdds([GAME])
      vi.advanceTimersByTime(61_000)
      await getWeekOdds([GAME])
      expect(fetchMock).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('reports when the slate was fetched, not when it was read', async () => {
    const first = await getWeekOdds([GAME])
    const second = await getWeekOdds([GAME])
    expect(second.fetchedAt).toBe(first.fetchedAt)
  })
})

describe('getOddsForGame', () => {
  it('prefers the requested book when it has posted', async () => {
    const odds = await getOddsForGame(GAME, 'fanduel')
    expect(odds.bookmakerKey).toBe('fanduel')
    expect(odds.requestedBookmakerKey).toBeUndefined()
  })

  it('falls through priority and discloses the swap', async () => {
    const odds = await getOddsForGame(OTHER, 'draftkings')
    expect(odds.bookmakerKey).toBe('fanduel')
    expect(odds.requestedBookmakerKey).toBe('draftkings')
  })

  it('starts at DraftKings when no book was chosen', async () => {
    expect((await getOddsForGame(GAME)).bookmakerKey).toBe('draftkings')
  })

  it('refuses a game no book has listed', async () => {
    const unlisted = makeGame({ gameId: 'g-unlisted', dateTime: '2026-10-12T20:00:00Z' })
    await expect(getOddsForGame(unlisted)).rejects.toThrow(/No lines listed yet/)
  })
})
