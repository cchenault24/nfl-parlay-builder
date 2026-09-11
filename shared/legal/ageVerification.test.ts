import { describe, expect, it } from 'vitest'
import {
  isVerified,
  newVerification,
  VERIFICATION_EXPIRY_DAYS,
} from './ageVerification'

// This is a compliance control, and it is the reason the iOS build carries an
// age gate at all. Every case below is one where getting it wrong lets an
// unverified user past on relaunch, which is invisible until a rejection or a
// regulator.

const DAY_MS = 1000 * 60 * 60 * 24
const NOW = Date.parse('2026-09-11T12:00:00.000Z')
const daysAgo = (days: number) => NOW - days * DAY_MS

const stored = (record: Record<string, unknown>) => JSON.stringify(record)

describe('isVerified', () => {
  it('accepts a record written moments ago', () => {
    expect(isVerified(stored({ verified: true, timestamp: NOW }), NOW)).toBe(true)
  })

  it('accepts a record inside the expiry window', () => {
    expect(
      isVerified(stored({ verified: true, timestamp: daysAgo(29) }), NOW)
    ).toBe(true)
  })

  it('rejects a record exactly at the expiry boundary', () => {
    expect(
      isVerified(
        stored({ verified: true, timestamp: daysAgo(VERIFICATION_EXPIRY_DAYS) }),
        NOW
      )
    ).toBe(false)
  })

  it('rejects a record past the expiry window', () => {
    expect(
      isVerified(stored({ verified: true, timestamp: daysAgo(400) }), NOW)
    ).toBe(false)
  })

  // The record exists and parses; it just says the user was never verified.
  // Dropping the `verified` check would let this through.
  it('rejects a record that says the user was not verified', () => {
    expect(isVerified(stored({ verified: false, timestamp: NOW }), NOW)).toBe(false)
  })

  it('rejects a truthy-but-not-true verified flag', () => {
    expect(isVerified(stored({ verified: 'yes', timestamp: NOW }), NOW)).toBe(false)
    expect(isVerified(stored({ verified: 1, timestamp: NOW }), NOW)).toBe(false)
  })

  it('fails closed when nothing is stored', () => {
    expect(isVerified(null, NOW)).toBe(false)
    expect(isVerified('', NOW)).toBe(false)
  })

  it('fails closed on unreadable storage', () => {
    expect(isVerified('{not json', NOW)).toBe(false)
  })

  it('fails closed on the wrong shape', () => {
    expect(isVerified('[]', NOW)).toBe(false)
    expect(isVerified('null', NOW)).toBe(false)
    expect(isVerified('"verified"', NOW)).toBe(false)
    expect(isVerified('42', NOW)).toBe(false)
  })

  it('fails closed when the timestamp is missing or not a number', () => {
    expect(isVerified(stored({ verified: true }), NOW)).toBe(false)
    expect(isVerified(stored({ verified: true, timestamp: 'now' }), NOW)).toBe(false)
  })

  // Moving the device clock forward, verifying, then moving it back would
  // otherwise buy an indefinite pass.
  it('rejects a timestamp in the future', () => {
    expect(
      isVerified(stored({ verified: true, timestamp: NOW + DAY_MS }), NOW)
    ).toBe(false)
  })
})

describe('newVerification', () => {
  it('produces a record that verifies', () => {
    expect(isVerified(JSON.stringify(newVerification(NOW)), NOW)).toBe(true)
  })

  it('produces a record that stops verifying once it expires', () => {
    const record = JSON.stringify(newVerification(NOW))
    const later = NOW + (VERIFICATION_EXPIRY_DAYS + 1) * DAY_MS

    expect(isVerified(record, later)).toBe(false)
  })
})
