import { describe, expect, it } from 'vitest'
import { normalizeStoredParlay, parlayStatus, type StoredParlay } from './parlays'

// Saved parlays outlive every shape change the app makes, so this is the one
// place a document written by an older client becomes a current one. Getting it
// wrong does not throw — it renders History blank.

const LEGACY_SINGLE_GAME: StoredParlay = {
  gameId: 'g-bal-cin',
  gameContext: 'CIN @ BAL — Week 5',
  week: 5,
  gameDateTime: '2026-10-11T17:00:00Z',
  combinedOdds: 250,
  parlayConfidence: 0.6,
  model: 'gpt-5.6-terra',
  gameSummary: {
    matchupSummary: 'Baltimore controls the line of scrimmage.',
    keyFactors: ['Rush defense', 'Rest'],
    gamePrediction: {
      winner: 'Baltimore Ravens',
      projectedScore: { home: 27, away: 20 },
      winProbability: 0.62,
    },
  },
}

describe('normalizeStoredParlay', () => {
  it('promotes a pre-cross-game document’s single gameId to a list', () => {
    const parlay = normalizeStoredParlay(LEGACY_SINGLE_GAME, 'doc-1')
    expect(parlay.gameIds).toEqual(['g-bal-cin'])
  })

  it('wraps a pre-cross-game analysis as a one-game slate', () => {
    const { gameSummary } = normalizeStoredParlay(LEGACY_SINGLE_GAME, 'doc-1')
    expect(gameSummary.slateSummary).toBeNull()
    expect(gameSummary.games).toHaveLength(1)
    expect(gameSummary.games[0]).toMatchObject({
      gameId: 'g-bal-cin',
      matchupSummary: 'Baltimore controls the line of scrimmage.',
      gamePrediction: { winner: 'Baltimore Ravens' },
    })
  })

  it('keeps a current document’s analysis as it is', () => {
    const current: StoredParlay = {
      gameIds: ['a', 'b'],
      gameSummary: {
        games: [
          {
            gameId: 'a',
            matchupSummary: 'x',
            keyFactors: ['1'],
            gamePrediction: {
              winner: 'Baltimore Ravens',
              projectedScore: { home: 1, away: 2 },
              winProbability: 0.5,
            },
          },
        ],
        slateSummary: 'Two games that move together.',
      },
    }
    const { gameSummary, gameIds } = normalizeStoredParlay(current, 'doc-2')
    expect(gameIds).toEqual(['a', 'b'])
    expect(gameSummary.games).toHaveLength(1)
    expect(gameSummary.slateSummary).toBe('Two games that move together.')
  })

  it('prefers gameIds when a document carries both', () => {
    expect(
      normalizeStoredParlay({ gameId: 'a', gameIds: ['a', 'b'] }, 'doc-3').gameIds
    ).toEqual(['a', 'b'])
  })

  it('survives a document that names no game at all', () => {
    const parlay = normalizeStoredParlay({}, 'doc-4')
    expect(parlay.gameIds).toEqual([])
    expect(parlay.gameSummary.games[0].gameId).toBe('')
  })

  it('uses the doc id as the parlay id, not the stored field', () => {
    // The same run saved twice would otherwise carry one id across two docs.
    expect(normalizeStoredParlay({ parlayId: 'run_x' }, 'doc-5').parlayId).toBe('doc-5')
  })

  it('treats a leg saved before `anchored` existed as anchored', () => {
    // Those saves were made under the old all-or-nothing rule, so every leg
    // they contain was anchored by definition.
    const parlay = normalizeStoredParlay(
      { gameId: 'a', legs: [{ team: 'Baltimore Ravens', odds: -110 }] },
      'doc-6'
    )
    expect(parlay.legs[0].anchored).toBe(true)
  })

  it('reads the older field names for bet type, selection and odds', () => {
    const parlay = normalizeStoredParlay(
      {
        gameId: 'a',
        estimatedOdds: '250',
        legs: [{ type: 'spread', pick: 'Ravens -3.5', team: 'Baltimore Ravens' }],
      },
      'doc-7'
    )
    expect(parlay.combinedOdds).toBe(250)
    expect(parlay.legs[0]).toMatchObject({ betType: 'spread', selection: 'Ravens -3.5' })
  })
})

describe('parlayStatus', () => {
  const now = Date.parse('2026-09-13T17:00:00Z')

  it('names the graded outcome', () => {
    expect(
      parlayStatus(
        { gameDateTime: '2026-09-13T17:00:00Z', grading: { status: 'graded', parlayOutcome: 'won' } },
        now
      )
    ).toEqual({ label: 'Won', tone: 'success' })
  })

  it('is upcoming before kickoff, whatever the sweep has recorded', () => {
    expect(
      parlayStatus({ gameDateTime: '2026-09-14T17:00:00Z', grading: { status: 'pending' } }, now)
    ).toEqual({ label: 'Upcoming', tone: 'info' })
  })

  it('is not graded once the game has started and no outcome exists', () => {
    expect(parlayStatus({ gameDateTime: '2026-09-13T16:00:00Z' }, now)).toEqual({
      label: 'Not graded',
      tone: 'muted',
    })
  })
})
