import { describe, expect, it } from 'vitest'
import type { AgentStep } from './types'
import {
  currentStepLabel,
  formatElapsed,
  stepFraction,
  stepProgressLabel,
  STEP_ROWS,
} from './agentSteps'

const step = (id: string, overrides: Partial<AgentStep> = {}): AgentStep => ({
  id,
  type: 'tool',
  status: 'ok',
  startedAt: '2026-10-10T00:00:00.000Z',
  ...overrides,
})

describe('STEP_ROWS', () => {
  it('is the eight the timeline renders, whatever the slate size', () => {
    expect(STEP_ROWS).toHaveLength(8)
  })
})

describe('stepProgressLabel', () => {
  it('counts games through a multi-game step', () => {
    expect(stepProgressLabel(step('x', { progress: { done: 4, total: 6 } }))).toBe('4 of 6')
  })

  it('says nothing for a single-game run', () => {
    expect(stepProgressLabel(step('x'))).toBeUndefined()
    expect(stepProgressLabel(undefined)).toBeUndefined()
  })
})

describe('currentStepLabel', () => {
  it('names the running step', () => {
    expect(
      currentStepLabel([
        step('step_plan'),
        step('step_tool_espn_team_stats', { status: 'running' }),
      ])
    ).toBe('Pull team statistics')
  })

  it('appends the count when the step spans games', () => {
    expect(
      currentStepLabel([
        step('step_tool_espn_team_stats', {
          status: 'running',
          progress: { done: 2, total: 3 },
        }),
      ])
    ).toBe('Pull team statistics · 2 of 3')
  })

  it('holds the last finished step rather than blanking between steps', () => {
    expect(currentStepLabel([step('step_plan'), step('step_tool_espn_game')])).toBe(
      'Load game, venue & forecast'
    )
  })

  it('says Starting before any step has landed', () => {
    expect(currentStepLabel([])).toBe('Starting')
  })
})

describe('stepFraction', () => {
  it('is zero before anything finishes', () => {
    expect(stepFraction([step('step_plan', { status: 'running' })])).toBe(0)
  })

  it('counts a failed optional step as done — the run moved past it', () => {
    expect(
      stepFraction([step('step_plan'), step('step_tool_odds', { status: 'failed' })])
    ).toBe(0.25)
  })

  it('never exceeds one', () => {
    expect(stepFraction(STEP_ROWS.concat(STEP_ROWS).map(r => step(r.id)))).toBe(1)
  })
})

describe('formatElapsed', () => {
  it.each([
    [0, '0s'],
    [4_600, '4s'],
    [59_999, '59s'],
    [60_000, '1m 0s'],
    [95_000, '1m 35s'],
  ])('renders %dms as %s', (ms, expected) => {
    expect(formatElapsed(ms)).toBe(expected)
  })

  it('never renders a negative clock', () => {
    expect(formatElapsed(-500)).toBe('0s')
  })
})

// A shipped binary keeps running against a server that moves on, which an App
// Store release makes routine — so the `?? 'Working'` fallbacks are a real path,
// not a defensive one. Every other case in this file feeds an id that is in
// STEP_ROWS, so nothing exercised them.
describe('an unrecognised step id', () => {
  it('falls back to Working for a running step', () => {
    expect(currentStepLabel([step('step_tool_something_new', { status: 'running' })])).toBe(
      'Working'
    )
  })

  it('keeps the progress count alongside the fallback', () => {
    expect(
      currentStepLabel([
        step('step_tool_something_new', {
          status: 'running',
          progress: { done: 4, total: 6 },
        }),
      ])
    ).toBe('Working · 4 of 6')
  })

  it('falls back to Working for the last finished step', () => {
    expect(currentStepLabel([step('step_tool_something_new', { status: 'ok' })])).toBe(
      'Working'
    )
  })

  it('still counts toward progress', () => {
    expect(stepFraction([step('step_tool_something_new', { status: 'ok' })])).toBeCloseTo(
      1 / STEP_ROWS.length
    )
  })
})

// The length assertion elsewhere pins the count but not the ids or the flags,
// so a rename or a moved `optional` passes it. AgentProgress reads `optional` as
// the sole input deciding whether a failed step reads "unavailable — continuing"
// or surfaces the raw error, which is the difference between a degraded run
// looking fine and a broken one looking benign.
describe('the step contract itself', () => {
  it('keeps the ids the server emits, in order', () => {
    expect(STEP_ROWS.map(row => row.id)).toEqual([
      'step_plan',
      'step_tool_espn_game',
      'step_tool_espn_team_stats',
      'step_tool_espn_pregame',
      'step_tool_nflverse_epa',
      'step_tool_odds',
      'step_draft',
      'step_validate',
    ])
  })

  it('keeps exactly the tool steps optional', () => {
    expect(STEP_ROWS.filter(row => row.optional).map(row => row.id)).toEqual([
      'step_tool_espn_team_stats',
      'step_tool_espn_pregame',
      'step_tool_nflverse_epa',
      'step_tool_odds',
    ])
  })

  it('never lets the run’s own steps be optional', () => {
    for (const id of ['step_plan', 'step_tool_espn_game', 'step_draft', 'step_validate']) {
      expect(STEP_ROWS.find(row => row.id === id)?.optional).toBeUndefined()
    }
  })
})
