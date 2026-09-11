import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeGame, makeSecondGame } from '../testing/fixtures'
import type { GradableLeg } from './gradeLeg'

const espn = vi.hoisted(() => ({ getGame: vi.fn(), getBoxScore: vi.fn() }))
vi.mock('../providers/espn/client', () => espn)

const { gradeParlayDocs, parlayGameIds } = await import('./sweep')

const FINAL_A = makeGame({ status: 'final', homeScore: 27, awayScore: 20 })
const FINAL_B = makeSecondGame({ status: 'final', homeScore: 17, awayScore: 24 })

const leg = (team: string, overrides: Partial<GradableLeg> = {}): GradableLeg => ({
  betType: 'moneyline',
  team,
  player: null,
  line: null,
  side: null,
  ...overrides,
})

// A stand-in for a Firestore QueryDocumentSnapshot: only `data()` and `ref.set`
// are reached, and the written document is what the assertions look at.
function doc(data: Record<string, unknown>) {
  const written: Record<string, unknown> = {}
  return {
    data: () => data,
    ref: {
      set: vi.fn(async (patch: Record<string, unknown>) => {
        Object.assign(written, patch)
      }),
    },
    written,
  }
}

// The stub carries `written` alongside the two members the sweep touches, so
// the cast names the shape it actually reads rather than reaching for `any`.
const grade = (d: ReturnType<typeof doc>) =>
  gradeParlayDocs([d] as unknown as Parameters<typeof gradeParlayDocs>[0])

beforeEach(() => {
  vi.clearAllMocks()
  espn.getBoxScore.mockResolvedValue(null)
  espn.getGame.mockImplementation(async (_season: number, id: string) =>
    [FINAL_A, FINAL_B].find(g => g.gameId === id)
  )
})

describe('parlayGameIds', () => {
  it('reads the list when it is there', () => {
    expect(parlayGameIds({ gameIds: ['a', 'b'], gameId: 'a' })).toEqual(['a', 'b'])
  })

  it('falls back to the single id on a parlay saved before cross-game existed', () => {
    expect(parlayGameIds({ gameId: 'a' })).toEqual(['a'])
  })

  it('returns nothing when a document names no game at all', () => {
    expect(parlayGameIds({})).toEqual([])
  })
})

describe('gradeParlayDocs', () => {
  it('grades a single-game parlay', async () => {
    const d = doc({
      gameId: FINAL_A.gameId,
      gameIds: [FINAL_A.gameId],
      gameDateTime: FINAL_A.dateTime,
      legs: [leg('Baltimore Ravens'), leg('Cincinnati Bengals')],
    })
    const result = await grade(d)

    expect(result).toEqual({ checked: 1, graded: 1 })
    expect(d.written.grading).toMatchObject({
      status: 'graded',
      legOutcomes: ['won', 'lost'],
      parlayOutcome: 'lost',
    })
  })

  it('grades each leg of a cross-game parlay against its own game', async () => {
    const d = doc({
      gameId: FINAL_A.gameId,
      gameIds: [FINAL_A.gameId, FINAL_B.gameId],
      gameDateTime: FINAL_A.dateTime,
      // Baltimore won theirs; Kansas City won theirs on the road.
      legs: [leg('Baltimore Ravens'), leg('Kansas City Chiefs'), leg('Denver Broncos')],
    })
    await grade(d)

    expect(d.written.grading).toMatchObject({
      legOutcomes: ['won', 'won', 'lost'],
      parlayOutcome: 'lost',
    })
  })

  it('waits for every game before grading a cross-game parlay', async () => {
    espn.getGame.mockImplementation(async (_season: number, id: string) =>
      id === FINAL_A.gameId ? FINAL_A : makeSecondGame({ status: 'in_progress' })
    )
    const d = doc({
      gameIds: [FINAL_A.gameId, FINAL_B.gameId],
      gameDateTime: FINAL_A.dateTime,
      legs: [leg('Baltimore Ravens'), leg('Kansas City Chiefs')],
    })
    const result = await grade(d)

    expect(result.graded).toBe(0)
    expect(d.written.grading).toEqual({ status: 'pending' })
  })

  it('leaves a leg for a team in no game of the parlay ungraded', async () => {
    const d = doc({
      gameIds: [FINAL_A.gameId],
      gameDateTime: FINAL_A.dateTime,
      legs: [leg('Baltimore Ravens'), leg('Chicago Bears')],
    })
    await grade(d)

    expect(d.written.grading).toMatchObject({ legOutcomes: ['won', 'ungraded'] })
  })

  it('skips a parlay that is already graded', async () => {
    const d = doc({
      gameIds: [FINAL_A.gameId],
      gameDateTime: FINAL_A.dateTime,
      legs: [leg('Baltimore Ravens')],
      grading: { status: 'graded' },
    })
    await grade(d)
    expect(d.ref.set).not.toHaveBeenCalled()
  })

  it('skips a parlay whose game cannot be loaded', async () => {
    espn.getGame.mockResolvedValue(null)
    const d = doc({
      gameIds: [FINAL_A.gameId],
      gameDateTime: FINAL_A.dateTime,
      legs: [leg('Baltimore Ravens')],
    })
    await grade(d)
    expect(d.ref.set).not.toHaveBeenCalled()
  })
})
