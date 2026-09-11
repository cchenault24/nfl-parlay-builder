import { describe, expect, it } from 'vitest'
import { parsePartialJson } from './partialJson'

// The buffer a streamed draft actually produces: one growing prefix of the
// response schema, analysisSummary first and legs after.
const FULL = JSON.stringify({
  analysisSummary: {
    games: [
      {
        matchupSummary: 'Cincinnati at home off a 4-1 stretch.',
        keyFactors: ['Home form', 'Rest edge', 'Secondary injuries'],
        gamePrediction: {
          winner: 'Cincinnati Bengals',
          projectedScore: { home: 27, away: 23 },
          winProbability: 0.58,
        },
      },
    ],
    slateSummary: null,
  },
  legs: [
    {
      betType: 'moneyline',
      team: 'Cincinnati Bengals',
      player: null,
      selection: 'Cincinnati Bengals Moneyline',
      line: 0,
      side: null,
      odds: -198,
      confidence: 0.68,
      reasoning: 'The more dependable offensive baseline at home.',
    },
  ],
})

describe('parsePartialJson', () => {
  it('returns the whole document once it is complete', () => {
    expect(parsePartialJson(FULL)).toEqual(JSON.parse(FULL))
  })

  it('never throws on any prefix of a real draft', () => {
    for (let i = 0; i <= FULL.length; i += 1) {
      expect(() => parsePartialJson(FULL.slice(0, i))).not.toThrow()
    }
  })

  // The point of the whole module: prose shows up as it is typed rather than
  // all at once when the object closes.
  it('surfaces a sentence that is still being written', () => {
    const cut = FULL.indexOf('off a 4-1')
    const partial = parsePartialJson(FULL.slice(0, cut)) as {
      analysisSummary: { games: { matchupSummary: string }[] }
    }
    expect(partial.analysisSummary.games[0].matchupSummary).toBe(
      'Cincinnati at home '
    )
  })

  it('grows monotonically through the prefixes it can read', () => {
    let seen = 0
    for (let i = 0; i <= FULL.length; i += 1) {
      const partial = parsePartialJson(FULL.slice(0, i)) as {
        legs?: unknown[]
      } | null
      const legs = partial?.legs?.length ?? 0
      expect(legs).toBeGreaterThanOrEqual(seen)
      seen = legs
    }
    expect(seen).toBe(1)
  })

  it.each([
    ['nothing', ''],
    ['whitespace', '   '],
    ['a bare opening brace', '{'],
  ])('reads %s as no content yet', (_label, raw) => {
    expect(parsePartialJson(raw)).toEqual(raw.trim() === '{' ? {} : null)
  })

  it.each([
    ['an open object', '{"a": 1', { a: 1 }],
    ['a trailing comma', '{"a": 1,', { a: 1 }],
    ['a key with no value', '{"a": 1, "b":', { a: 1 }],
    ['a key still being typed', '{"a": 1, "bb', { a: 1 }],
    ['a value still being typed', '{"a": "hel', { a: 'hel' }],
    // `2.` is `2` with the decimal point not yet typed, so the digits already
    // committed to are kept.
    ['a half-written number', '{"a": 1, "b": 2.', { a: 1, b: 2 }],
    ['a half-written keyword', '{"a": 1, "b": nul', { a: 1 }],
    ['nested arrays', '{"a": [{"b": ["one", "tw', { a: [{ b: ['one', 'tw'] }] }],
    ['a trailing escape', '{"a": "line\\', { a: 'line' }],
    ['an escaped quote mid-value', '{"a": "he said \\"y', { a: 'he said "y' }],
  ])('closes %s', (_label, raw, expected) => {
    expect(parsePartialJson(raw)).toEqual(expected)
  })

  it('gives up rather than guessing when the prefix makes no sense', () => {
    expect(parsePartialJson('not json at all')).toBeNull()
  })
})
