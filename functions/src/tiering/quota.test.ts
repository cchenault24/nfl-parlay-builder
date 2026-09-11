import { beforeEach, describe, expect, it, vi } from 'vitest'

// A Firestore transaction reduced to what these two functions actually use: one
// read and one write against a single document. That is enough to assert the
// decisions — whether a slot is handed out, and what `used` becomes — without a
// real database, and it makes the read-before-write ordering visible.

let stored: { windowStart: string; used: number } | undefined
let written: { windowStart: string; used: number } | undefined

const tx = {
  get: vi.fn(async () => ({
    exists: stored !== undefined,
    data: () => stored,
  })),
  set: vi.fn((_ref: unknown, value: { windowStart: string; used: number }) => {
    written = value
  }),
}

vi.mock('../firebase', () => ({
  db: () => ({ collection: () => ({ doc: () => ({}) }) }),
}))

vi.mock('../providers/odds/client', () => ({ SUPPORTED_BOOKMAKERS: [] }))
vi.mock('../billing/config', () => ({
  appleConfigured: () => false,
  stripeConfigured: () => false,
}))

const { quotaWindowStart } = await import('./capabilities')
const { releaseGenerationInTx, reserveGenerationInTx } = await import('./store')

// A Wednesday, comfortably inside one Tuesday→Monday bucket.
const NOW = new Date('2026-09-09T18:00:00.000Z')
const WINDOW = quotaWindowStart(NOW)
// Far enough ahead to be a different bucket.
const LATER = new Date('2026-09-23T18:00:00.000Z')

beforeEach(() => {
  vi.clearAllMocks()
  stored = undefined
  written = undefined
})

describe('reserveGenerationInTx', () => {
  it('takes the first slot when nothing has been used', async () => {
    const window = await reserveGenerationInTx(tx as never, 'uid-1', 2, NOW)

    expect(window).toBe(WINDOW)
    expect(written).toEqual({ windowStart: WINDOW, used: 1 })
  })

  it('takes a further slot while one remains', async () => {
    stored = { windowStart: WINDOW, used: 1 }

    const window = await reserveGenerationInTx(tx as never, 'uid-1', 2, NOW)

    expect(window).toBe(WINDOW)
    expect(written).toEqual({ windowStart: WINDOW, used: 2 })
  })

  // The boundary the whole change exists for. Two separate HTTP requests used
  // to read used:1 and both pass; now the second one loses this write.
  it('refuses the slot that would exceed the limit, and writes nothing', async () => {
    stored = { windowStart: WINDOW, used: 2 }

    const window = await reserveGenerationInTx(tx as never, 'uid-1', 2, NOW)

    expect(window).toBeNull()
    expect(tx.set).not.toHaveBeenCalled()
  })

  it('refuses when usage has somehow run past the limit', async () => {
    stored = { windowStart: WINDOW, used: 5 }

    expect(await reserveGenerationInTx(tx as never, 'uid-1', 2, NOW)).toBeNull()
  })

  // null is unbounded, which is not the same as a limit of zero.
  it('always grants a slot on an unlimited plan', async () => {
    stored = { windowStart: WINDOW, used: 900 }

    const window = await reserveGenerationInTx(tx as never, 'uid-1', null, NOW)

    expect(window).toBe(WINDOW)
    expect(written).toEqual({ windowStart: WINDOW, used: 901 })
  })

  it('refuses immediately on a limit of zero', async () => {
    expect(await reserveGenerationInTx(tx as never, 'uid-1', 0, NOW)).toBeNull()
  })

  // A stale bucket is treated as empty rather than reset by a separate write,
  // so a user who never generates never causes one.
  it('starts a fresh count when the stored window has rolled over', async () => {
    stored = { windowStart: quotaWindowStart(NOW), used: 2 }

    const window = await reserveGenerationInTx(tx as never, 'uid-1', 2, LATER)

    expect(window).toBe(quotaWindowStart(LATER))
    expect(written).toEqual({ windowStart: quotaWindowStart(LATER), used: 1 })
  })

  it('reads before it writes, as a Firestore transaction requires', async () => {
    await reserveGenerationInTx(tx as never, 'uid-1', 2, NOW)

    expect(tx.get.mock.invocationCallOrder[0]).toBeLessThan(
      tx.set.mock.invocationCallOrder[0]
    )
  })
})

describe('releaseGenerationInTx', () => {
  it('gives the slot back', async () => {
    stored = { windowStart: WINDOW, used: 2 }

    await releaseGenerationInTx(tx as never, 'uid-1', WINDOW, NOW)

    expect(written).toEqual({ windowStart: WINDOW, used: 1 })
  })

  // Refunding into the current bucket would hand out a free generation every
  // time a run straddled the Tuesday rollover.
  it('drops a release whose window has already rolled over', async () => {
    stored = { windowStart: quotaWindowStart(LATER), used: 1 }

    await releaseGenerationInTx(tx as never, 'uid-1', WINDOW, LATER)

    expect(tx.set).not.toHaveBeenCalled()
  })

  it('drops a release when the stored bucket is a different window', async () => {
    stored = { windowStart: quotaWindowStart(LATER), used: 1 }

    await releaseGenerationInTx(tx as never, 'uid-1', WINDOW, NOW)

    expect(tx.set).not.toHaveBeenCalled()
  })

  it('does nothing when there is no quota record at all', async () => {
    await releaseGenerationInTx(tx as never, 'uid-1', WINDOW, NOW)

    expect(tx.set).not.toHaveBeenCalled()
  })

  it('never drives usage below zero', async () => {
    stored = { windowStart: WINDOW, used: 0 }

    await releaseGenerationInTx(tx as never, 'uid-1', WINDOW, NOW)

    expect(written).toEqual({ windowStart: WINDOW, used: 0 })
  })

  // Reserve then release must be a no-op overall, which is what makes a failed
  // run free to the user.
  it('round-trips with a reservation', async () => {
    const window = await reserveGenerationInTx(tx as never, 'uid-1', 2, NOW)
    stored = written
    await releaseGenerationInTx(tx as never, 'uid-1', window as string, NOW)

    expect(written).toEqual({ windowStart: WINDOW, used: 0 })
  })
})
