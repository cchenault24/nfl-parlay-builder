import { describe, expect, it, vi } from 'vitest'

vi.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: vi.fn(),
}))

const { uuidFromHex } = await import('./accountToken')

// Apple validates the shape and silently drops a token it cannot parse, so the
// formatting is the part worth pinning — a stray character or a wrong nibble
// costs the fallback attribution path with no error anywhere.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

describe('uuidFromHex', () => {
  it('produces a well-formed UUID', () => {
    expect(uuidFromHex('0'.repeat(64))).toMatch(UUID)
  })

  it('stamps version 5', () => {
    expect(uuidFromHex('f'.repeat(64)).split('-')[2][0]).toBe('5')
  })

  it('stamps a valid variant nibble', () => {
    for (const fill of '0123456789abcdef') {
      const variant = uuidFromHex(fill.repeat(64)).split('-')[3][0]
      expect('89ab').toContain(variant)
    }
  })

  it('is deterministic', () => {
    const hex = 'a3f1'.repeat(16)
    expect(uuidFromHex(hex)).toBe(uuidFromHex(hex))
  })

  it('differs for different inputs', () => {
    expect(uuidFromHex('a'.repeat(64))).not.toBe(uuidFromHex('b'.repeat(64)))
  })

  it('uses only the first 32 hex characters', () => {
    const head = '0123456789abcdef'.repeat(2)
    expect(uuidFromHex(head + 'f'.repeat(32))).toBe(uuidFromHex(head))
  })

  it('ignores separators and case in the input', () => {
    expect(uuidFromHex('AB'.repeat(16))).toBe(uuidFromHex('ab'.repeat(16)))
    expect(uuidFromHex('ab-'.repeat(16))).toBe(uuidFromHex('ab'.repeat(16)))
  })

  it('refuses input too short to fill a UUID', () => {
    expect(() => uuidFromHex('abc')).toThrow(/32 hex/)
    expect(() => uuidFromHex('')).toThrow(/32 hex/)
  })
})
