import { describe, expect, it } from 'vitest'
import { makeGame, makeOdds, makeSecondGame } from '../testing/fixtures'
import type { ParlayClosingLines } from '../grading/types'
import { mergeClosingLines, type StoredLeg } from './computeClv'

const GAME = makeGame()
const OTHER = makeSecondGame()
const BOTH = [GAME.gameId, OTHER.gameId]

const leg = (overrides: Partial<StoredLeg> = {}): StoredLeg => ({
  betType: 'spread',
  team: 'Baltimore Ravens',
  player: null,
  line: -3.5,
  side: null,
  odds: -110,
  anchored: true,
  ...overrides,
})

// One leg in each game, which is the shape a cross-game parlay actually takes.
const CROSS_LEGS = [
  leg({ team: 'Baltimore Ravens' }),
  leg({ team: 'Kansas City Chiefs', line: -2.5 }),
]

const capture = (
  game: typeof GAME,
  legs: StoredLeg[],
  existing?: ParlayClosingLines,
  gameIds = BOTH,
  odds = makeOdds()
) => mergeClosingLines({ legs, gameIds, game, closingOdds: odds, existing })

describe('mergeClosingLines — single game', () => {
  const single = [GAME.gameId]

  it('prices every leg and finishes in one pass', () => {
    const result = capture(GAME, [leg()], undefined, single)
    expect(result.complete).toBe(true)
    expect(result.capturedGameIds).toEqual([GAME.gameId])
    expect(result.legs[0]).toMatchObject({
      closingLine: -3.5,
      closingOdds: -110,
      clvPoints: 0,
      bookmaker: 'DraftKings',
    })
  })

  it('claims no CLV from a leg whose line moved', () => {
    const result = capture(GAME, [leg({ line: -2.5 })], undefined, single)
    expect(result.legs[0]).toMatchObject({
      unavailable: 'line_moved',
      clvPoints: null,
      closingLine: -3.5,
    })
  })

  it('has no close to beat for an unanchored leg', () => {
    const result = capture(GAME, [leg({ anchored: false })], undefined, single)
    expect(result.legs[0]).toMatchObject({ unavailable: 'unanchored', bookmaker: null })
  })

  it('records that the market was unreadable, not that nobody looked', () => {
    const result = mergeClosingLines({
      legs: [leg()],
      gameIds: single,
      game: GAME,
      closingOdds: null,
      existing: undefined,
    })
    expect(result.legs[0]).toMatchObject({ unavailable: 'no_market', bookmaker: null })
    expect(result.complete).toBe(true)
  })

  it('averages only the legs it could judge', () => {
    const result = capture(
      GAME,
      [leg(), leg({ betType: 'total', side: 'over', line: 44.5, odds: -120 })],
      undefined,
      single
    )
    // The spread was taken at -110 and closed there — no edge either way. The
    // total was taken at -120 and closed at -108, so it paid more juice than
    // the market settled at: 2.6 implied points the wrong way.
    expect(result.legs.map(l => l.clvPoints)).toEqual([0, -2.6])
    expect(result.averageClvPoints).toBe(-1.3)
  })

  it('reads a price better than the close as positive', () => {
    const result = capture(
      GAME,
      [leg()],
      undefined,
      single,
      makeOdds({ spread: { line: -3.5, homePrice: -130, awayPrice: 110 } })
    )
    expect(result.legs[0].clvPoints).toBeGreaterThan(0)
  })
})

describe('mergeClosingLines — across games', () => {
  it('prices only the game that is closing and leaves the rest pending', () => {
    const first = capture(GAME, CROSS_LEGS)

    expect(first.complete).toBe(false)
    expect(first.capturedGameIds).toEqual([GAME.gameId])
    expect(first.legs[0].unavailable).toBeUndefined()
    expect(first.legs[1]).toMatchObject({
      unavailable: 'not_yet_closed',
      clvPoints: null,
    })
  })

  it('finishes when the last game closes', () => {
    const first = capture(GAME, CROSS_LEGS)
    const second = capture(
      OTHER,
      CROSS_LEGS,
      first,
      BOTH,
      makeOdds({ spread: { line: -2.5, homePrice: -130, awayPrice: 105 } })
    )

    expect(second.complete).toBe(true)
    expect(second.capturedGameIds).toEqual(BOTH)
    expect(second.legs.every(l => l.unavailable !== 'not_yet_closed')).toBe(true)
    // The Chiefs are the away side of the second game.
    expect(second.legs[1]).toMatchObject({ closingOdds: 105, closingLine: 2.5 })
  })

  // The first game's market is gone by the time the second closes. Re-reading
  // it would replace a real close with a later, meaningless number.
  it('never recomputes a leg that has already been priced', () => {
    const first = capture(GAME, CROSS_LEGS)
    const second = capture(
      OTHER,
      CROSS_LEGS,
      first,
      BOTH,
      makeOdds({ spread: { line: -9.5, homePrice: -500, awayPrice: 380 } })
    )
    expect(second.legs[0]).toEqual(first.legs[0])
  })

  it('is idempotent for a game captured twice inside the window', () => {
    const first = capture(GAME, CROSS_LEGS)
    const again = capture(GAME, CROSS_LEGS, first)
    expect(again.capturedGameIds).toEqual([GAME.gameId])
    expect(again.legs).toEqual(first.legs)
  })

  it('averages what has been judged so far rather than waiting', () => {
    const first = capture(GAME, CROSS_LEGS)
    expect(first.averageClvPoints).toBe(0)
  })

  // A leg naming a team in none of the parlay's games would hold the parlay
  // open forever if completeness were derived from pending legs.
  it('completes on the games it covers, not on every leg being priced', () => {
    const legs = [...CROSS_LEGS, leg({ team: 'Chicago Bears' })]
    const first = capture(GAME, legs)
    const second = capture(OTHER, legs, first)

    expect(second.complete).toBe(true)
    expect(second.legs[2].unavailable).toBe('not_yet_closed')
  })

  it('records each leg against the book its own game closed at', () => {
    const first = capture(GAME, CROSS_LEGS)
    const second = capture(
      OTHER,
      CROSS_LEGS,
      first,
      BOTH,
      makeOdds({ bookmaker: 'FanDuel', bookmakerKey: 'fanduel' })
    )
    expect(second.legs.map(l => l.bookmaker)).toEqual(['DraftKings', 'FanDuel'])
  })
})
