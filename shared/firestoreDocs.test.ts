import { describe, expect, it } from 'vitest'
import {
  parlayDocument,
  sortedParlays,
  toUserProfile,
  userProfileDocument,
  type TimestampedParlay,
} from './firestoreDocs'

const at = (ms: number) => ({ toMillis: () => ms })

const parlay = (overrides: Record<string, unknown> = {}) => ({
  legs: [],
  combinedOdds: -110,
  parlayConfidence: 0.5,
  gameIds: ['g1'],
  ...overrides,
})

describe('parlayDocument', () => {
  // firestore.rules requires userId, gameIds, legs and a server-set createdAt.
  // A field dropped here is a write the rules reject, which reaches the user as
  // "Failed to save parlay. Please try again." with nothing pointing at why.
  it('carries the fields the rules require', () => {
    const doc = parlayDocument('uid-1', parlay() as never, 'server-timestamp')

    expect(doc.userId).toBe('uid-1')
    expect(doc.gameIds).toEqual(['g1'])
    expect(doc.legs).toEqual([])
    expect(doc.createdAt).toBe('server-timestamp')
  })

  it('keeps the rest of the parlay intact', () => {
    const doc = parlayDocument('uid-1', parlay({ combinedOdds: 250 }) as never, null)

    expect(doc.combinedOdds).toBe(250)
  })

  // The caller owns the uid; a parlay that arrived carrying someone else's must
  // not be able to claim it.
  it('always uses the caller’s uid', () => {
    const doc = parlayDocument('uid-1', parlay({ userId: 'uid-other' }) as never, null)

    expect(doc.userId).toBe('uid-1')
  })
})

describe('sortedParlays', () => {
  const docs = [
    { id: 'a', data: { ...parlay(), createdAt: at(100) } as TimestampedParlay },
    { id: 'b', data: { ...parlay(), createdAt: at(300) } as TimestampedParlay },
    { id: 'c', data: { ...parlay(), createdAt: at(200) } as TimestampedParlay },
  ]

  it('returns newest first', () => {
    expect(sortedParlays(docs).map(p => p.parlayId)).toEqual(['b', 'c', 'a'])
  })

  // Firestore may return either field, which is why the sort cannot be a
  // Firestore orderBy.
  it('falls back to savedAt when createdAt is absent', () => {
    const mixed = [
      { id: 'a', data: { ...parlay(), savedAt: at(500) } as TimestampedParlay },
      { id: 'b', data: { ...parlay(), createdAt: at(100) } as TimestampedParlay },
    ]

    expect(sortedParlays(mixed).map(p => p.parlayId)).toEqual(['a', 'b'])
  })

  it('prefers createdAt when both are present', () => {
    const both = [
      {
        id: 'a',
        data: { ...parlay(), createdAt: at(100), savedAt: at(900) } as TimestampedParlay,
      },
      { id: 'b', data: { ...parlay(), createdAt: at(200) } as TimestampedParlay },
    ]

    expect(sortedParlays(both).map(p => p.parlayId)).toEqual(['b', 'a'])
  })

  it('treats a document with no timestamp as oldest', () => {
    const mixed = [
      { id: 'a', data: parlay() as TimestampedParlay },
      { id: 'b', data: { ...parlay(), createdAt: at(1) } as TimestampedParlay },
    ]

    expect(sortedParlays(mixed).map(p => p.parlayId)).toEqual(['b', 'a'])
  })

  it('applies the history depth to the newest end', () => {
    expect(sortedParlays(docs, 2).map(p => p.parlayId)).toEqual(['b', 'c'])
  })

  it('treats a null depth as unbounded', () => {
    expect(sortedParlays(docs, null)).toHaveLength(3)
  })

  it('handles a depth of zero and an empty input', () => {
    expect(sortedParlays(docs, 0)).toEqual([])
    expect(sortedParlays([], 5)).toEqual([])
  })

  it('does not mutate the caller’s array', () => {
    const input = [...docs]
    sortedParlays(input)

    expect(input.map(d => d.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('userProfileDocument', () => {
  it('uses the display name when there is one', () => {
    const doc = userProfileDocument(
      { displayName: 'Chris', email: 'chris@example.com', photoURL: null },
      'now'
    )

    expect(doc.displayName).toBe('Chris')
  })

  it('falls back to the local part of the email', () => {
    const doc = userProfileDocument(
      { displayName: null, email: 'chris@example.com', photoURL: null },
      'now'
    )

    expect(doc.displayName).toBe('chris')
  })

  it('falls back again when there is no email either', () => {
    const doc = userProfileDocument(
      { displayName: null, email: null, photoURL: null },
      'now'
    )

    expect(doc.displayName).toBe('User')
  })

  // The old fallback put the user's email in a query string to a third-party
  // avatar service on every render, and stored that URL in Firestore forever.
  it('stores null rather than a generated avatar URL', () => {
    const doc = userProfileDocument(
      { displayName: null, email: 'chris@example.com', photoURL: null },
      'now'
    )

    // The email belongs in `email`; what must never happen again is it ending
    // up inside a third-party avatar URL.
    expect(doc.photoURL).toBeNull()
    expect(String(doc.photoURL ?? '')).not.toContain('chris@example.com')
  })

  it('keeps a real photo URL', () => {
    const doc = userProfileDocument(
      { displayName: 'Chris', email: null, photoURL: 'https://cdn.test/a.png' },
      'now'
    )

    expect(doc.photoURL).toBe('https://cdn.test/a.png')
  })
})

describe('toUserProfile', () => {
  const complete = {
    displayName: 'Chris',
    email: 'chris@example.com',
    createdAt: 'ts',
    photoURL: 'https://cdn.test/a.png',
    savedParlays: ['p1'],
  }

  it('maps a complete document', () => {
    expect(toUserProfile('uid-1', complete)).toEqual({
      uid: 'uid-1',
      displayName: 'Chris',
      email: 'chris@example.com',
      photoURL: 'https://cdn.test/a.png',
      createdAt: 'ts',
      savedParlays: ['p1'],
    })
  })

  it('defaults savedParlays and drops an empty photoURL', () => {
    const profile = toUserProfile('uid-1', {
      displayName: 'Chris',
      email: 'chris@example.com',
      createdAt: 'ts',
      photoURL: '',
    })

    expect(profile?.savedParlays).toEqual([])
    expect(profile?.photoURL).toBeUndefined()
  })

  // Half a profile renders a blank where a name belongs, so an incomplete
  // document is treated as absent — the caller signs the user in either way.
  it.each([
    ['no document at all', undefined],
    ['a missing display name', { email: 'e', createdAt: 'ts' }],
    ['a missing email', { displayName: 'Chris', createdAt: 'ts' }],
    ['a missing createdAt', { displayName: 'Chris', email: 'e' }],
    ['an empty object', {}],
  ])('returns null for %s', (_label, data) => {
    expect(toUserProfile('uid-1', data as Record<string, unknown> | undefined)).toBeNull()
  })
})
