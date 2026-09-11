import { describe, expect, it } from 'vitest'
import { capabilitiesFor } from '../tiering/capabilities'
import type { EntitlementView } from '../tiering/store'
import { makeGame, makeSecondGame } from '../testing/fixtures'
import { resolveRunInput } from './agentRunInput'

const GAME = makeGame()
const OTHER = makeSecondGame()
const NEXT_WEEK = makeGame({ gameId: 'g-next-week', week: 6 })
const SCHEDULE = [GAME, OTHER, NEXT_WEEK]

function entitlements(
  tier: 'free' | 'pro',
  quotaRemaining: number | null = 2
): EntitlementView {
  const capabilities = capabilitiesFor(tier)
  return {
    tier,
    capabilities,
    sportsbooks: [{ key: 'draftkings', title: 'DraftKings' }],
    billingAvailable: { stripe: false, apple: true },
    quota: {
      used: 0,
      limit: capabilities.generationsPerWeek,
      remaining: quotaRemaining,
      windowStart: '2026-10-06',
      resetsAt: '2026-10-13T00:00:00.000Z',
    },
  }
}

const resolve = (body: unknown, view = entitlements('pro')) =>
  resolveRunInput({ body, entitlements: view, schedule: SCHEDULE })

describe('resolveRunInput', () => {
  it('accepts a single-game run and returns it as a one-element list', () => {
    const { input } = resolve({ gameIds: [GAME.gameId] }, entitlements('free'))
    expect(input).toEqual({
      gameIds: [GAME.gameId],
      riskLevel: 'moderate',
      legCount: 3,
      playerProps: false,
    })
  })

  it('accepts a cross-game run on Pro', () => {
    const { input } = resolve({
      gameIds: [GAME.gameId, OTHER.gameId],
      legCount: 4,
    })
    expect(input?.gameIds).toEqual([GAME.gameId, OTHER.gameId])
    expect(input?.legCount).toBe(4)
  })

  it('omits bookmaker entirely when none was chosen', () => {
    const { input } = resolve({ gameIds: [GAME.gameId] })
    expect(input && 'bookmaker' in input).toBe(false)
  })

  it('keeps a chosen bookmaker on Pro', () => {
    const { input } = resolve({ gameIds: [GAME.gameId], bookmaker: 'fanduel' })
    expect(input?.bookmaker).toBe('fanduel')
  })

  describe('validation_error', () => {
    it.each([
      ['missing gameIds', {}],
      ['empty gameIds', { gameIds: [] }],
      ['a bare gameId', { gameId: GAME.gameId }],
      ['blank ids only', { gameIds: ['  ', ''] }],
      ['a bad risk level', { gameIds: [GAME.gameId], riskLevel: 'reckless' }],
    ])('refuses %s', (_label, body) => {
      const { refusal } = resolve(body)
      expect(refusal).toMatchObject({ status: 400, code: 'validation_error' })
    })

    it('refuses duplicate ids', () => {
      const { refusal } = resolve({ gameIds: [GAME.gameId, GAME.gameId] })
      expect(refusal).toMatchObject({ status: 400, code: 'validation_error' })
      expect(refusal?.message).toContain('repeat')
    })

    it('refuses an id that is not on the schedule', () => {
      const { refusal } = resolve({ gameIds: [GAME.gameId, 'g-nope'] })
      expect(refusal).toMatchObject({ status: 400, code: 'validation_error' })
      expect(refusal?.message).toContain('g-nope')
    })

    it('refuses games from two different weeks', () => {
      const { refusal } = resolve({ gameIds: [GAME.gameId, NEXT_WEEK.gameId] })
      expect(refusal).toMatchObject({ status: 400, code: 'validation_error' })
      expect(refusal?.message).toContain('same week')
    })

    it('refuses an unsupported bookmaker', () => {
      const { refusal } = resolve({
        gameIds: [GAME.gameId],
        bookmaker: 'bovada',
      })
      expect(refusal).toMatchObject({ status: 400, code: 'validation_error' })
    })
  })

  describe('tier refusals', () => {
    it('refuses cross-game on free with cross_game_locked', () => {
      const { refusal } = resolve(
        { gameIds: [GAME.gameId, OTHER.gameId] },
        entitlements('free')
      )
      expect(refusal).toMatchObject({ status: 403, code: 'cross_game_locked' })
      expect(refusal?.details).toMatchObject({
        tier: 'free',
        maxGamesPerRun: 1,
      })
    })

    it('refuses more games than Pro allows with too_many_games', () => {
      const seven = Array.from({ length: 7 }, (_, i) => `g-${i}`)
      const { refusal } = resolve({ gameIds: seven })
      expect(refusal).toMatchObject({ status: 403, code: 'too_many_games' })
      expect(refusal?.message).toContain('6 games')
    })

    it('refuses an exhausted quota', () => {
      const { refusal } = resolve(
        { gameIds: [GAME.gameId] },
        entitlements('free', 0)
      )
      expect(refusal).toMatchObject({ status: 403, code: 'quota_exhausted' })
    })

    it('refuses a locked risk level', () => {
      const { refusal } = resolve(
        { gameIds: [GAME.gameId], riskLevel: 'aggressive' },
        entitlements('free')
      )
      expect(refusal).toMatchObject({ status: 403, code: 'risk_level_locked' })
    })

    it('refuses a leg count free cannot choose', () => {
      const { refusal } = resolve(
        { gameIds: [GAME.gameId], legCount: 5 },
        entitlements('free')
      )
      expect(refusal).toMatchObject({ status: 403, code: 'leg_count_locked' })
    })

    it('refuses a chosen sportsbook on free', () => {
      const { refusal } = resolve(
        { gameIds: [GAME.gameId], bookmaker: 'draftkings' },
        entitlements('free')
      )
      expect(refusal).toMatchObject({ status: 403, code: 'sportsbook_locked' })
    })
  })

  it('checks the tier cap before the schedule, so unknown ids do not mask the upsell', () => {
    const { refusal } = resolve(
      { gameIds: ['g-nope-1', 'g-nope-2'] },
      entitlements('free')
    )
    expect(refusal?.code).toBe('cross_game_locked')
  })
})
