import { describe, expect, it } from 'vitest'
import { normalizeRunSettings, type TierCapabilities } from './tiering'

// Mirrors functions/src/tiering/capabilities.ts. These are the two shapes the
// server actually hands out, and the clamp is only meaningful against them.
const FREE: TierCapabilities = {
  generationsPerWeek: 2,
  riskLevels: ['moderate'],
  legCount: { min: 3, max: 3, default: 3 },
  maxGamesPerRun: 1,
  playerProps: false,
  chooseSportsbook: false,
  historyDepth: 10,
  rejectedLegs: false,
  performanceRecord: false,
  lineMoveAlerts: false,
}

const PRO: TierCapabilities = {
  generationsPerWeek: null,
  riskLevels: ['conservative', 'moderate', 'aggressive'],
  legCount: { min: 2, max: 6, default: 3 },
  maxGamesPerRun: 4,
  playerProps: true,
  chooseSportsbook: true,
  historyDepth: null,
  rejectedLegs: true,
  performanceRecord: true,
  lineMoveAlerts: true,
}

const choice = (overrides: Partial<Parameters<typeof normalizeRunSettings>[1]> = {}) => ({
  riskLevel: 'moderate' as const,
  legCount: undefined,
  bookmaker: undefined,
  ...overrides,
})

describe('normalizeRunSettings — bookmaker', () => {
  // The failure this prevents: the sheet shows the pinned book as selected and
  // does not lock it, so one tap writes it to the store. The server then answers
  // 403 sportsbook_locked to every run, and no UI can clear the value.
  it('sends nothing for a plan that cannot choose, even when one is stored', () => {
    expect(normalizeRunSettings(FREE, choice({ bookmaker: 'draftkings' })).bookmaker)
      .toBeUndefined()
  })

  it('sends nothing before entitlements have loaded', () => {
    expect(
      normalizeRunSettings(undefined, choice({ bookmaker: 'fanduel' })).bookmaker
    ).toBeUndefined()
  })

  it('sends a Pro user’s chosen book', () => {
    expect(normalizeRunSettings(PRO, choice({ bookmaker: 'fanduel' })).bookmaker).toBe(
      'fanduel'
    )
  })

  it('treats no choice and an empty choice alike', () => {
    expect(normalizeRunSettings(PRO, choice()).bookmaker).toBeUndefined()
    expect(normalizeRunSettings(PRO, choice({ bookmaker: '' })).bookmaker).toBeUndefined()
  })

  // A lapsed subscription is the realistic path into this: the value was
  // legitimate when it was stored.
  it('drops a book chosen while Pro once the plan has lapsed', () => {
    expect(normalizeRunSettings(FREE, choice({ bookmaker: 'fanduel' })).bookmaker)
      .toBeUndefined()
  })
})

describe('normalizeRunSettings — legCount', () => {
  it('falls back to the plan default when nothing is chosen', () => {
    expect(normalizeRunSettings(PRO, choice()).legCount).toBe(3)
    expect(normalizeRunSettings(FREE, choice()).legCount).toBe(3)
  })

  it('clamps a Pro choice into the allowed range', () => {
    expect(normalizeRunSettings(PRO, choice({ legCount: 9 })).legCount).toBe(6)
    expect(normalizeRunSettings(PRO, choice({ legCount: 1 })).legCount).toBe(2)
    expect(normalizeRunSettings(PRO, choice({ legCount: 5 })).legCount).toBe(5)
  })

  // Free has min === max, so every choice collapses to the one permitted value
  // rather than being refused with 403 leg_count_locked.
  it('pins a demoted Pro user’s leg count to what Free allows', () => {
    expect(normalizeRunSettings(FREE, choice({ legCount: 6 })).legCount).toBe(3)
  })

  // Nothing is known about the range yet, so there is no limit to send and the
  // server's own default is the only honest answer. Inventing one here is what
  // the "clients never hardcode a limit" rule exists to stop.
  it('sends nothing before entitlements have loaded', () => {
    expect(normalizeRunSettings(undefined, choice({ legCount: 6 })).legCount)
      .toBeUndefined()
    expect(normalizeRunSettings(undefined, choice()).legCount).toBeUndefined()
  })
})

describe('normalizeRunSettings — riskLevel', () => {
  it('keeps a risk level the plan allows', () => {
    expect(normalizeRunSettings(PRO, choice({ riskLevel: 'aggressive' })).riskLevel).toBe(
      'aggressive'
    )
    expect(normalizeRunSettings(FREE, choice({ riskLevel: 'moderate' })).riskLevel).toBe(
      'moderate'
    )
  })

  it('falls back to the first allowed level when the stored one is gated', () => {
    expect(normalizeRunSettings(FREE, choice({ riskLevel: 'aggressive' })).riskLevel).toBe(
      'moderate'
    )
    expect(
      normalizeRunSettings(FREE, choice({ riskLevel: 'conservative' })).riskLevel
    ).toBe('moderate')
  })

  it('falls back to moderate before entitlements have loaded', () => {
    expect(
      normalizeRunSettings(undefined, choice({ riskLevel: 'aggressive' })).riskLevel
    ).toBe('moderate')
  })
})

describe('normalizeRunSettings — a demoted Pro user', () => {
  // Every field at once, which is what actually happens when a subscription
  // lapses or is refunded while the user sits on the Build tab.
  it('produces a request Free is allowed to make', () => {
    expect(
      normalizeRunSettings(FREE, {
        riskLevel: 'aggressive',
        legCount: 6,
        bookmaker: 'fanduel',
      })
    ).toEqual({ riskLevel: 'moderate', legCount: 3, bookmaker: undefined })
  })
})
