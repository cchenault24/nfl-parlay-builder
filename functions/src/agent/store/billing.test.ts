import { describe, expect, it } from 'vitest'
import {
  makeAnalysis,
  makeGame,
  makeLeg,
  makeOdds,
  makeSecondGame,
} from '../../testing/fixtures'
import type {
  AgentGameResult,
  AgentResult,
  AgentRun,
  SourceStatus,
} from '../shared/schemas'
import { isBillable } from './firestore'

function gameResult(
  game = makeGame(),
  odds: SourceStatus = 'ok'
): AgentGameResult {
  return {
    game,
    homeStats: null,
    awayStats: null,
    odds: odds === 'ok' ? makeOdds() : null,
    sources: { stats: 'ok', odds, weather: 'ok' },
  }
}

function result(games: AgentGameResult[]): AgentResult {
  return {
    parlay: {
      legs: [makeLeg()],
      combinedOdds: -110,
      parlayConfidence: 0.6,
      gameSummary: makeAnalysis(),
    },
    games,
    model: 'test-model',
  }
}

const succeeded = (games: AgentGameResult[]): Partial<AgentRun> => ({
  status: 'succeeded',
  result: result(games),
})

describe('isBillable', () => {
  it('bills a single-game run with real odds', () => {
    expect(isBillable(succeeded([gameResult()]))).toBe(true)
  })

  it('bills a cross-game run once when every game got real odds', () => {
    expect(
      isBillable(succeeded([gameResult(), gameResult(makeSecondGame())]))
    ).toBe(true)
  })

  it('does not bill when one game fell back to estimated prices', () => {
    expect(
      isBillable(
        succeeded([gameResult(), gameResult(makeSecondGame(), 'unavailable')])
      )
    ).toBe(false)
  })

  it('does not bill a single-game run with estimated prices', () => {
    expect(isBillable(succeeded([gameResult(makeGame(), 'unavailable')]))).toBe(
      false
    )
  })

  it.each(['failed', 'canceled'] as const)('does not bill a %s run', status => {
    expect(isBillable({ status, result: result([gameResult()]) })).toBe(false)
  })

  it('does not bill a success with no result', () => {
    expect(isBillable({ status: 'succeeded' })).toBe(false)
  })

  it('does not bill a success with no games', () => {
    expect(isBillable(succeeded([]))).toBe(false)
  })
})
