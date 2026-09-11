import { describe, expect, it } from 'vitest'
import type { QuotaState } from '@shared/tiering'
import type { AgentGameResult, SourceStatus } from '@shared/types'
import { generationCostLine, unbilledNotice, waitEstimate } from './quotaCopy'

const free = (remaining: number): QuotaState => ({
  used: 2 - remaining,
  limit: 2,
  remaining,
  windowStart: '2026-10-06',
  resetsAt: '2026-10-13T00:00:00.000Z',
})

const pro: QuotaState = {
  used: 4,
  limit: null,
  remaining: null,
  windowStart: '2026-10-06',
  resetsAt: '2026-10-13T00:00:00.000Z',
}

const gameResult = (odds: SourceStatus): AgentGameResult =>
  ({ sources: { stats: 'ok', odds, weather: 'ok' } }) as AgentGameResult

describe('generationCostLine', () => {
  it('states the cost and the condition on free', () => {
    expect(generationCostLine(free(2))).toBe(
      'Counts as 1 of your 2 parlays this week if it gets live book prices.'
    )
  })

  it('says what an exhausted week means rather than repeating the cost', () => {
    expect(generationCostLine(free(0))).toBe(
      'No parlays left this week. Your next 2 arrive Tuesday.'
    )
  })

  it('says nothing to Pro, who has no counter', () => {
    expect(generationCostLine(pro)).toBeNull()
    expect(generationCostLine(undefined)).toBeNull()
  })
})

describe('unbilledNotice', () => {
  it('says nothing when every game got real prices', () => {
    expect(unbilledNotice([gameResult('ok'), gameResult('ok')], free(1))).toBeNull()
  })

  it('credits the run when any game fell back to estimates', () => {
    expect(unbilledNotice([gameResult('ok'), gameResult('unavailable')], free(2))).toBe(
      "Prices are AI estimates, so this one didn't count against your 2 this week."
    )
  })

  it('says nothing to Pro', () => {
    expect(unbilledNotice([gameResult('unavailable')], pro)).toBeNull()
  })

  it('says nothing before the run has any games', () => {
    expect(unbilledNotice(undefined, free(1))).toBeNull()
    expect(unbilledNotice([], free(1))).toBeNull()
  })
})

describe('waitEstimate', () => {
  it('keeps the single-game copy it has always had', () => {
    expect(waitEstimate(1)).toBe('Runs usually take 20–60 seconds.')
  })

  it('grows with the slate, because the old sentence stops being true', () => {
    expect(waitEstimate(3)).toBe('3 games usually take 40–100 seconds.')
    expect(waitEstimate(6)).toBe('6 games usually take 70–160 seconds.')
  })
})
