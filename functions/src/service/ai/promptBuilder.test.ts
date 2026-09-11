import { describe, expect, it } from 'vitest'
import {
  makeGame,
  makeOdds,
  makeSecondGame,
  makeTeamStats,
} from '../../testing/fixtures'
import { buildParlayPrompt, type PromptGame } from './promptBuilder'
import { buildGenerateResponseSchema } from './schemas'

function entry(game = makeGame()): PromptGame {
  return {
    game,
    homeStats: makeTeamStats(),
    awayStats: makeTeamStats({ teamId: 'cin', teamName: 'Cincinnati Bengals' }),
    odds: makeOdds(),
    pregame: null,
    epa: null,
  }
}

const base = { leagueAverages: null, riskLevel: 'moderate' as const, playerProps: false }

describe('buildParlayPrompt', () => {
  it('reads as a single-game prompt for one game', () => {
    const prompt = buildParlayPrompt({ ...base, games: [entry()], legCount: 3 })
    expect(prompt).toContain('Generate a 3-leg NFL parlay for Cincinnati Bengals @ Baltimore Ravens')
    expect(prompt).not.toContain('GAME 1 of')
    expect(prompt).toContain('slateSummary: null')
    expect(prompt).toContain('at most one spread leg, one total leg, and one moneyline leg')
  })

  it('numbers the games and relaxes the market rule across them', () => {
    const prompt = buildParlayPrompt({
      ...base,
      games: [entry(), entry(makeSecondGame())],
      legCount: 4,
    })
    expect(prompt).toContain('ONE 4-leg NFL parlay drawing on 2 games')
    expect(prompt).toContain('GAME 1 of 2: Cincinnati Bengals @ Baltimore Ravens')
    expect(prompt).toContain('GAME 2 of 2: Kansas City Chiefs @ Denver Broncos')
    expect(prompt).toContain('Across different games these limits do not apply')
    expect(prompt).toContain('exactly 2 entries, one per game above')
  })

  it('lists every team a leg may name', () => {
    const prompt = buildParlayPrompt({
      ...base,
      games: [entry(), entry(makeSecondGame())],
      legCount: 4,
    })
    for (const team of [
      'Baltimore Ravens',
      'Cincinnati Bengals',
      'Kansas City Chiefs',
      'Denver Broncos',
    ]) {
      expect(prompt).toContain(`"${team}"`)
    }
  })

  it('states the missing-lines fallback per game', () => {
    const prompt = buildParlayPrompt({
      ...base,
      games: [{ ...entry(), odds: null }],
      legCount: 3,
    })
    expect(prompt).toContain('Betting lines: NOT AVAILABLE')
  })
})

describe('buildGenerateResponseSchema', () => {
  // The leg array used to be pinned to exactly three whatever the caller asked
  // for, so a Pro user choosing four got a schema demanding three.
  it.each([2, 3, 4, 6])('bounds the leg array at %d', legCount => {
    const schema = buildGenerateResponseSchema(legCount)
    const legs = Array.from({ length: legCount }, () => ({
      betType: 'spread' as const,
      team: 'Baltimore Ravens',
      player: null,
      selection: 'Ravens -3.5',
      line: -3.5,
      side: null,
      odds: -110,
      confidence: 0.6,
      reasoning: 'because',
    }))
    const analysisSummary = {
      games: [
        {
          matchupSummary: 'x',
          keyFactors: ['a', 'b', 'c'],
          gamePrediction: {
            winner: 'Baltimore Ravens',
            projectedScore: { home: 27, away: 20 },
            winProbability: 0.6,
          },
        },
      ],
      slateSummary: null,
    }
    expect(schema.safeParse({ analysisSummary, legs }).success).toBe(true)
    expect(schema.safeParse({ analysisSummary, legs: legs.slice(1) }).success).toBe(false)
  })
})
