import { describe, expect, it } from 'vitest'
import {
  CHUNK_SIZE,
  chunkKey,
  joinChunks,
  manifestKey,
  parseManifest,
  splitValue,
  staleChunkIndices,
} from './secureChunks'

// The keychain caps one value at 2048 bytes and Firebase's auth blob is larger,
// so it is stored in pieces. Everything here is a way that reassembly could go
// quietly wrong and hand Firebase a corrupt credential.

describe('splitValue', () => {
  it('keeps a short value in one piece', () => {
    expect(splitValue('abc')).toEqual(['abc'])
  })

  it('splits exactly at the chunk size', () => {
    const value = 'x'.repeat(CHUNK_SIZE)

    expect(splitValue(value)).toEqual([value])
  })

  it('starts a second piece one character past the boundary', () => {
    const value = 'x'.repeat(CHUNK_SIZE + 1)
    const chunks = splitValue(value)

    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toHaveLength(CHUNK_SIZE)
    expect(chunks[1]).toBe('x')
  })

  it('splits a realistically sized auth blob', () => {
    const chunks = splitValue('y'.repeat(3000))

    expect(chunks.length).toBe(Math.ceil(3000 / CHUNK_SIZE))
    expect(chunks.every(c => c.length <= CHUNK_SIZE)).toBe(true)
  })

  // An empty string is a real value — it is not the same as nothing stored, and
  // returning no chunks would make the manifest say zero and read back as null.
  it('represents an empty value as one empty piece', () => {
    expect(splitValue('')).toEqual([''])
  })

  it('round-trips any value', () => {
    for (const value of ['', 'a', 'x'.repeat(CHUNK_SIZE * 3 + 7), '{"a":1}']) {
      expect(joinChunks(splitValue(value))).toBe(value)
    }
  })

  // Chunking slices UTF-16 code units, so a surrogate pair can land across a
  // boundary. Rejoining has to put it back byte for byte.
  it('round-trips a value with astral-plane characters', () => {
    const value = '🏈'.repeat(CHUNK_SIZE)

    expect(joinChunks(splitValue(value))).toBe(value)
  })
})

describe('joinChunks', () => {
  it('concatenates in order', () => {
    expect(joinChunks(['a', 'b', 'c'])).toBe('abc')
  })

  // A partially readable credential is not a credential. Handing Firebase half
  // a JSON blob would fail somewhere far from the cause; null just signs the
  // user in again.
  it('returns null when any piece is missing', () => {
    expect(joinChunks(['a', null, 'c'])).toBeNull()
    expect(joinChunks([null])).toBeNull()
  })

  it('treats an empty piece as present', () => {
    expect(joinChunks([''])).toBe('')
    expect(joinChunks(['a', '', 'c'])).toBe('ac')
  })
})

describe('parseManifest', () => {
  it('reads a well-formed manifest', () => {
    expect(parseManifest('{"chunks":3}')).toEqual({ chunks: 3 })
  })

  it('accepts zero chunks', () => {
    expect(parseManifest('{"chunks":0}')).toEqual({ chunks: 0 })
  })

  it.each([
    ['nothing stored', null],
    ['an empty string', ''],
    ['unparseable JSON', '{not json'],
    ['the wrong shape', '{"count":3}'],
    ['a non-numeric count', '{"chunks":"3"}'],
    ['a negative count', '{"chunks":-1}'],
    ['an array', '[]'],
    ['null', 'null'],
  ])('fails closed on %s', (_label, raw) => {
    expect(parseManifest(raw)).toBeNull()
  })
})

describe('staleChunkIndices', () => {
  // A shorter value leaves the tail of a longer one in the keychain. Those
  // pieces are dead weight at best, and readable credential fragments at worst.
  it('names the pieces a shorter value leaves behind', () => {
    expect(staleChunkIndices(5, 2)).toEqual([2, 3, 4])
  })

  it('names nothing when the value grew', () => {
    expect(staleChunkIndices(2, 5)).toEqual([])
  })

  it('names nothing when the length is unchanged', () => {
    expect(staleChunkIndices(3, 3)).toEqual([])
  })

  it('names every piece when the value is cleared', () => {
    expect(staleChunkIndices(3, 0)).toEqual([0, 1, 2])
  })

  it('handles a first write, where there was nothing before', () => {
    expect(staleChunkIndices(0, 4)).toEqual([])
  })
})

// expo-secure-store's own rule, copied so a key it would refuse fails here
// rather than at sign-in.
const SECURE_STORE_KEY = /^[\w.-]+$/
const FIREBASE_KEY = 'firebase:authUser:AIzaSyExample:[DEFAULT]'

describe('chunkKey', () => {
  it('keeps each piece under its own distinct key', () => {
    expect(chunkKey('firebase_authUser_abc', 0)).toBe('firebase_authUser_abc.0')
    expect(chunkKey('firebase_authUser_abc', 1)).toBe('firebase_authUser_abc.1')
  })

  it('never collides with the manifest key', () => {
    expect(chunkKey(FIREBASE_KEY, 0)).not.toBe(manifestKey(FIREBASE_KEY))
  })

  it('turns the key Firebase actually uses into one SecureStore accepts', () => {
    expect(manifestKey(FIREBASE_KEY)).toMatch(SECURE_STORE_KEY)
    expect(chunkKey(FIREBASE_KEY, 3)).toMatch(SECURE_STORE_KEY)
  })

  it('maps the same key the same way every time', () => {
    expect(manifestKey(FIREBASE_KEY)).toBe(manifestKey(FIREBASE_KEY))
    expect(manifestKey(FIREBASE_KEY)).not.toBe(manifestKey('firebase:authUser:other:[DEFAULT]'))
  })
})
