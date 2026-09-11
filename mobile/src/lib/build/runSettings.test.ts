import { describe, expect, it } from 'vitest'
import type { TierCapabilities } from '@shared/tiering'
import type { BookLines } from '@shared/types'
import {
  bookOptions,
  effectiveBookKey,
  effectiveLegCount,
  legCountOptions,
  riskOptions,
  settingsSummary,
} from './runSettings'

const SPORTSBOOKS = [
  { key: 'draftkings', title: 'DraftKings' },
  { key: 'fanduel', title: 'FanDuel' },
  { key: 'betmgm', title: 'BetMGM' },
  { key: 'caesars', title: 'Caesars' },
]

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
  ...FREE,
  generationsPerWeek: null,
  riskLevels: ['conservative', 'moderate', 'aggressive'],
  legCount: { min: 2, max: 6, default: 3 },
  maxGamesPerRun: 6,
  playerProps: true,
  chooseSportsbook: true,
  historyDepth: null,
}

const lines = (posted: Record<string, boolean>): BookLines[] =>
  SPORTSBOOKS.map(b => ({
    key: b.key,
    title: b.title,
    posted: posted[b.key] ?? false,
    lastUpdate: null,
    spread: null,
    total: null,
    moneyline: null,
  }))

const ALL_POSTED = lines({ draftkings: true, fanduel: true, betmgm: true, caesars: true })
const HALF_POSTED = lines({ draftkings: true, fanduel: true })

describe('bookOptions on free', () => {
  const options = () =>
    bookOptions({
      sportsbooks: SPORTSBOOKS,
      capabilities: FREE,
      chosen: undefined,
      lines: HALF_POSTED,
    })

  it('pins the first book in the server’s own priority order', () => {
    expect(options().find(o => o.selected)?.key).toBe('draftkings')
  })

  it('locks every other book rather than hiding it', () => {
    expect(options().map(o => o.locked)).toEqual([false, true, true, true])
    expect(options()).toHaveLength(SPORTSBOOKS.length)
  })

  it('does not also mark locked books unavailable', () => {
    expect(options().every(o => !o.disabled)).toBe(true)
    expect(options().every(o => o.caption === undefined)).toBe(true)
  })
})

describe('bookOptions on Pro', () => {
  it('disables a book that has not posted this game, with a reason', () => {
    const options = bookOptions({
      sportsbooks: SPORTSBOOKS,
      capabilities: PRO,
      chosen: 'draftkings',
      lines: HALF_POSTED,
    })
    expect(options.filter(o => o.disabled).map(o => o.key)).toEqual(['betmgm', 'caesars'])
    expect(options.find(o => o.key === 'betmgm')?.caption).toBe('Not available')
    expect(options.every(o => !o.locked)).toBe(true)
  })

  it('keeps a posted choice selected', () => {
    const options = bookOptions({
      sportsbooks: SPORTSBOOKS,
      capabilities: PRO,
      chosen: 'fanduel',
      lines: ALL_POSTED,
    })
    expect(options.find(o => o.selected)?.key).toBe('fanduel')
  })

  it('falls to the next available book when the choice goes unavailable', () => {
    const options = bookOptions({
      sportsbooks: SPORTSBOOKS,
      capabilities: PRO,
      chosen: 'caesars',
      lines: HALF_POSTED,
    })
    expect(options.find(o => o.selected)?.key).toBe('draftkings')
  })

  it('disables nothing while the week’s lines are still loading', () => {
    const options = bookOptions({
      sportsbooks: SPORTSBOOKS,
      capabilities: PRO,
      chosen: 'caesars',
      lines: undefined,
    })
    expect(options.every(o => !o.disabled)).toBe(true)
    expect(options.find(o => o.selected)?.key).toBe('caesars')
  })

  it('selects nothing when no book has posted the game', () => {
    expect(
      effectiveBookKey({
        sportsbooks: SPORTSBOOKS,
        capabilities: PRO,
        chosen: 'fanduel',
        lines: lines({}),
      })
    ).toBeUndefined()
  })
})

describe('riskOptions', () => {
  it('locks everything but moderate on free', () => {
    expect(riskOptions(FREE).filter(o => !o.locked).map(o => o.value)).toEqual(['moderate'])
  })

  it('opens all three on Pro', () => {
    expect(riskOptions(PRO).every(o => !o.locked)).toBe(true)
  })

  it('locks everything but moderate before entitlements load', () => {
    expect(riskOptions(undefined).filter(o => !o.locked).map(o => o.value)).toEqual([
      'moderate',
    ])
  })
})

describe('legCountOptions', () => {
  it('offers 2 through 6 on Pro', () => {
    expect(legCountOptions(PRO).map(o => o.value)).toEqual([2, 3, 4, 5, 6])
    expect(legCountOptions(PRO).every(o => !o.locked)).toBe(true)
  })

  // The sheet says "2-6 with Pro", so all five have to be on screen — the
  // canvas review caught a version that showed four.
  it('shows every count on free with only 3 unlocked', () => {
    const options = legCountOptions(FREE)
    expect(options.map(o => o.value)).toEqual([2, 3, 4, 5, 6])
    expect(options.filter(o => !o.locked).map(o => o.value)).toEqual([3])
  })
})

describe('effectiveLegCount', () => {
  it('uses the tier default when nothing was chosen', () => {
    expect(effectiveLegCount(PRO, undefined)).toBe(3)
    expect(effectiveLegCount(FREE, undefined)).toBe(3)
  })

  it('clamps a choice the plan cannot reach', () => {
    expect(effectiveLegCount(FREE, 6)).toBe(3)
    expect(effectiveLegCount(PRO, 9)).toBe(6)
    expect(effectiveLegCount(PRO, 1)).toBe(2)
  })
})

describe('settingsSummary', () => {
  it('reads as one line', () => {
    expect(
      settingsSummary({ riskLevel: 'moderate', legCount: 3, bookTitle: 'DraftKings' })
    ).toBe('Moderate · 3 legs · DraftKings')
  })

  it('drops the book when none is available', () => {
    expect(
      settingsSummary({ riskLevel: 'aggressive', legCount: 5, bookTitle: undefined })
    ).toBe('Aggressive · 5 legs')
  })
})
