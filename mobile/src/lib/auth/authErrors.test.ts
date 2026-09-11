import { describe, expect, it } from 'vitest'
import { readableAuthError } from './authErrors'

describe('readableAuthError', () => {
  it('strips the auth/ prefix and the hyphens', () => {
    expect(readableAuthError({ code: 'auth/invalid-credential' })).toBe(
      'invalid credential'
    )
    expect(readableAuthError({ code: 'auth/email-already-in-use' })).toBe(
      'email already in use'
    )
  })

  it('handles a code with no hyphens', () => {
    expect(readableAuthError({ code: 'auth/internal' })).toBe('internal')
  })

  // The code is preferred over the message, which is Firebase's own developer
  // prose and reads like a stack trace to a user.
  it('prefers the code over the raw message', () => {
    expect(
      readableAuthError({
        code: 'auth/wrong-password',
        message: 'Firebase: Error (auth/wrong-password).',
      })
    ).toBe('wrong password')
  })

  it('falls back to the message when there is no code', () => {
    expect(readableAuthError({ message: 'Network request failed' })).toBe(
      'Network request failed'
    )
  })

  it('falls back to the message when the code is empty', () => {
    expect(readableAuthError({ code: '', message: 'Network request failed' })).toBe(
      'Network request failed'
    )
  })

  // Anything can reach the catch block, so nothing here may throw.
  it.each([
    ['an empty object', {}],
    ['null', null],
    ['undefined', undefined],
    ['a plain Error with no message', new Error('')],
  ])('falls back to a generic message for %s', (_label, input) => {
    expect(readableAuthError(input)).toBe('Authentication failed')
  })

  it('uses a plain Error’s message', () => {
    expect(readableAuthError(new Error('Something went wrong'))).toBe(
      'Something went wrong'
    )
  })
})
