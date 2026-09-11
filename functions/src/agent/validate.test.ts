import { describe, expect, it } from 'vitest'
import { makeAnalysis, makeGame, makeLeg } from '../testing/fixtures'
import { validateDraft, validationSummary, type DraftConstraints } from './validate'

// Characterization tests: one per rule the validator enforces today, written
// before task 4 rescopes the market rule per game. Anything that changes here
// afterwards is a behaviour change, not a refactor.

const GAME = makeGame()
const CONSTRAINTS: DraftConstraints = { legCount: 3, playerProps: true }

function run(legs: ReturnType<typeof makeLeg>[], constraints = CONSTRAINTS) {
  return validateDraft({ legs, analysisSummary: makeAnalysis() }, GAME, constraints)
}

// Three legs, one per market, none of them anchored — the shape every test
// below starts from and mutates one thing about.
function cleanLegs() {
  return [
    makeLeg({ betType: 'spread', team: 'Baltimore Ravens' }),
    makeLeg({
      betType: 'total',
      team: 'Baltimore Ravens',
      side: 'over',
      selection: 'Over 44.5',
      line: 44.5,
    }),
    makeLeg({
      betType: 'moneyline',
      team: 'Cincinnati Bengals',
      selection: 'Bengals ML',
      line: null,
      odds: 155,
    }),
  ]
}

describe('validateDraft', () => {
  it('passes a well-formed draft', () => {
    expect(run(cleanLegs())).toEqual([])
  })

  describe('leg count', () => {
    it('rejects fewer legs than asked for', () => {
      expect(run(cleanLegs().slice(0, 2))).toContain('expected 3 legs, got 2')
    })

    it('rejects more legs than asked for', () => {
      const legs = [...cleanLegs(), makeLeg({ betType: 'player_anytime_td', player: 'Zay Flowers' })]
      expect(run(legs)).toContain('expected 3 legs, got 4')
    })
  })

  describe('team membership', () => {
    it('rejects a leg for a team not in the game', () => {
      const legs = cleanLegs()
      legs[0] = makeLeg({ team: 'Kansas City Chiefs' })
      expect(run(legs)).toContain('leg 1: team "Kansas City Chiefs" is not in this game')
    })
  })

  describe('required text', () => {
    it('rejects a blank selection', () => {
      const legs = cleanLegs()
      legs[1] = makeLeg({ betType: 'total', side: 'over', selection: '   ' })
      expect(run(legs)).toContain('leg 2: selection and reasoning are required')
    })

    it('rejects blank reasoning', () => {
      const legs = cleanLegs()
      legs[1] = makeLeg({ betType: 'total', side: 'over', reasoning: '' })
      expect(run(legs)).toContain('leg 2: selection and reasoning are required')
    })
  })

  describe('odds range', () => {
    it.each([0, 99, -99, 20_001, -20_001])('rejects %d', odds => {
      const legs = cleanLegs()
      legs[0] = makeLeg({ odds })
      expect(run(legs)).toContain(`leg 1: odds ${odds} outside sane range`)
    })

    it.each([100, -100, 20_000, -20_000])('accepts %d', odds => {
      const legs = cleanLegs()
      legs[0] = makeLeg({ odds })
      expect(run(legs)).toEqual([])
    })
  })

  describe('player props', () => {
    it('rejects a prop on a plan without them', () => {
      const legs = cleanLegs()
      legs[0] = makeLeg({ betType: 'player_rushing_yards', player: 'Derrick Henry', side: 'over' })
      expect(run(legs, { legCount: 3, playerProps: false })).toContain(
        'leg 1: player props are not available on this plan'
      )
    })

    it('rejects a prop with no player name', () => {
      const legs = cleanLegs()
      legs[0] = makeLeg({ betType: 'player_rushing_yards', player: null, side: 'over' })
      expect(run(legs)).toContain('leg 1: player_rushing_yards requires a player name')
    })

    it('treats a whitespace-only player name as absent', () => {
      const legs = cleanLegs()
      legs[0] = makeLeg({ betType: 'player_rushing_yards', player: '   ', side: 'over' })
      expect(run(legs)).toContain('leg 1: player_rushing_yards requires a player name')
    })

    it('rejects a player name on a market leg', () => {
      const legs = cleanLegs()
      legs[0] = makeLeg({ betType: 'spread', player: 'Lamar Jackson' })
      expect(run(legs)).toContain('leg 1: player must be empty for spread')
    })

    it('accepts a well-formed prop', () => {
      const legs = cleanLegs()
      legs[0] = makeLeg({
        betType: 'player_rushing_yards',
        player: 'Derrick Henry',
        side: 'over',
        selection: 'Derrick Henry Over 78.5 Rushing Yards',
        line: 78.5,
      })
      expect(run(legs)).toEqual([])
    })
  })

  describe('anchored confidence', () => {
    it('rejects confidence at the implied probability', () => {
      const legs = cleanLegs()
      // -110 implies 0.5238...; equal is not "clears".
      legs[0] = makeLeg({ anchored: true, odds: -110, confidence: 110 / 210 })
      expect(run(legs)).toContain(
        `leg 1: confidence ${110 / 210} does not clear the implied probability of anchored odds -110`
      )
    })

    it('rejects confidence below the implied probability', () => {
      const legs = cleanLegs()
      legs[0] = makeLeg({ anchored: true, odds: -110, confidence: 0.4 })
      expect(run(legs)).toHaveLength(1)
    })

    it('accepts confidence above the implied probability', () => {
      const legs = cleanLegs()
      legs[0] = makeLeg({ anchored: true, odds: -110, confidence: 0.6 })
      expect(run(legs)).toEqual([])
    })

    it('does not apply the rule to an unanchored leg', () => {
      const legs = cleanLegs()
      legs[0] = makeLeg({ anchored: false, odds: -110, confidence: 0.1 })
      expect(run(legs)).toEqual([])
    })
  })

  describe('one leg per market', () => {
    it.each(['spread', 'moneyline', 'total'] as const)('rejects two %s legs', market => {
      const legs = [
        makeLeg({ betType: market, side: market === 'total' ? 'over' : null }),
        makeLeg({
          betType: market,
          team: 'Cincinnati Bengals',
          side: market === 'total' ? 'under' : null,
        }),
        makeLeg({ betType: 'player_anytime_td', player: 'Zay Flowers' }),
      ]
      expect(run(legs)).toContain(`2 ${market} legs; at most one allowed`)
    })

    it('does not restrict repeated player-prop types', () => {
      const legs = [
        makeLeg({ betType: 'player_anytime_td', player: 'Zay Flowers' }),
        makeLeg({ betType: 'player_anytime_td', player: 'Derrick Henry' }),
        makeLeg({ betType: 'spread' }),
      ]
      expect(run(legs)).toEqual([])
    })
  })

  describe('game prediction', () => {
    it('rejects a winner who is not in the game', () => {
      const issues = validateDraft(
        {
          legs: cleanLegs(),
          analysisSummary: makeAnalysis({
            gamePrediction: {
              winner: 'Kansas City Chiefs',
              projectedScore: { home: 27, away: 20 },
              winProbability: 0.6,
            },
          }),
        },
        GAME,
        CONSTRAINTS
      )
      expect(issues).toContain('predicted winner "Kansas City Chiefs" is not in this game')
    })

    it.each([
      ['home', { home: -1, away: 20 }],
      ['away', { home: 27, away: -3 }],
    ])('rejects a negative %s score', (_side, projectedScore) => {
      const issues = validateDraft(
        {
          legs: cleanLegs(),
          analysisSummary: makeAnalysis({
            gamePrediction: {
              winner: 'Baltimore Ravens',
              projectedScore,
              winProbability: 0.6,
            },
          }),
        },
        GAME,
        CONSTRAINTS
      )
      expect(issues).toContain('projected score cannot be negative')
    })
  })
})

describe('validationSummary', () => {
  it.each([
    ['leg 1: odds 0 outside sane range', 'The model returned a leg without a usable price.'],
    ['expected 3 legs, got 2', 'The model returned the wrong number of legs.'],
    ['leg 1: player_anytime_td requires a player name', 'The model returned a player prop without a player.'],
    ['leg 1: player must be empty for spread', 'The model returned a player prop without a player.'],
    ['leg 1: team "X" is not in this game', 'The model returned a leg for the wrong game.'],
    ['2 spread legs; at most one allowed', 'The model returned two legs for the same market.'],
    ['leg 1: confidence 0.4 does not clear the implied probability of anchored odds -110', 'The model had no edge over the book on one of its legs.'],
  ])('maps %s', (issue, expected) => {
    expect(validationSummary([issue])).toBe(expected)
  })

  it('falls back to a generic sentence', () => {
    expect(validationSummary(['something else'])).toBe('The model produced an invalid parlay.')
  })
})
