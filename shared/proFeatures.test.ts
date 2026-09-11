import { describe, expect, it } from 'vitest'
import { proFeatures } from './proFeatures'
import type { TierCapabilities } from './tiering'

// Mirrors functions/src/tiering/capabilities.ts.
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

describe('proFeatures', () => {
  it('leads with the weekly limit and then player props', () => {
    const features = proFeatures(PRO, FREE)

    expect(features[0]).toContain('Unlimited parlays')
    expect(features[1]).toContain('Player props')
  })

  // The whole point: the numbers come from the payload that enforces them, so
  // widening a limit server-side needs no client release.
  it('states the leg range the server actually allows', () => {
    expect(proFeatures(PRO, FREE)).toContain('Parlays from 2 to 6 legs')
  })

  it('follows a widened leg range without a client change', () => {
    const widened = { ...PRO, legCount: { min: 2, max: 8, default: 3 } }

    expect(proFeatures(widened, FREE)).toContain('Parlays from 2 to 8 legs')
  })

  it('names the free limit it is replacing', () => {
    expect(proFeatures(PRO, FREE)[0]).toBe('Unlimited parlays — no 2-a-week limit')
  })

  it('stays generic when the current tier is unknown', () => {
    expect(proFeatures(PRO)[0]).toBe('Unlimited parlays — no weekly limit')
  })

  it('stays generic for a user who is already unlimited', () => {
    expect(proFeatures(PRO, PRO)[0]).toBe('Unlimited parlays — no weekly limit')
  })

  it('lists the risk levels by name', () => {
    expect(proFeatures(PRO, FREE)).toContain(
      'Conservative, moderate and aggressive risk levels'
    )
  })

  it('states the cross-game cap the server allows', () => {
    expect(proFeatures(PRO, FREE)).toContain(
      'Cross-game parlays, up to 4 games at once'
    )
  })

  it('follows a widened cross-game cap', () => {
    const widened = { ...PRO, maxGamesPerRun: 6 }

    expect(proFeatures(widened, FREE)).toContain(
      'Cross-game parlays, up to 6 games at once'
    )
  })

  it('mentions the sportsbook choice and the full history', () => {
    const features = proFeatures(PRO, FREE)

    expect(features).toContain('Price every leg on your own sportsbook')
    expect(features).toContain(
      'Your full history, every season, with win rate and ROI'
    )
  })

  // A capability turned off server-side must stop being advertised, or the
  // sheet sells something the product no longer does.
  it('drops a feature the server has turned off', () => {
    const noProps = { ...PRO, playerProps: false, chooseSportsbook: false }
    const features = proFeatures(noProps, FREE)

    expect(features.join(' ')).not.toContain('Player props')
    expect(features.join(' ')).not.toContain('sportsbook')
  })

  it('drops cross-game when Pro is single-game only', () => {
    const single = { ...PRO, maxGamesPerRun: 1 }

    expect(proFeatures(single, FREE).join(' ')).not.toContain('Cross-game')
  })

  it('drops the history line when Pro’s history is bounded', () => {
    const bounded = { ...PRO, historyDepth: 50 }

    expect(proFeatures(bounded, FREE).join(' ')).not.toContain('full history')
  })

  it('drops the risk line when there is only one level', () => {
    const single = { ...PRO, riskLevels: ['moderate'] as TierCapabilities['riskLevels'] }

    expect(proFeatures(single, FREE).join(' ')).not.toContain('risk levels')
  })

  it('drops the leg line when the range is a single value', () => {
    const fixed = { ...PRO, legCount: { min: 3, max: 3, default: 3 } }

    expect(proFeatures(fixed, FREE).join(' ')).not.toContain('legs')
  })

  it('never spells a number the capabilities do not contain', () => {
    const features = proFeatures(PRO, FREE).join(' ')

    expect(features).not.toContain('$')
    expect(features).not.toContain('9.99')
  })
})
