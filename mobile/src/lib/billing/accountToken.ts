import * as Crypto from 'expo-crypto'

// Apple has no idea what a Firebase uid is. StoreKit's `appAccountToken` is the
// one field we control that Apple echoes back on every transaction and every
// server notification, so it is the only way to attribute a renewal to a user
// without relying solely on the originalTransactionId index.
//
// It must be a UUID, and a Firebase uid is not one — so the uid is hashed into
// UUID shape. Derived rather than stored: it has to be the same value on every
// device the account signs in from and after a reinstall, and anything
// generated once and persisted would not be.
//
// This is a stable pseudonym, not a secret. It is one-way (the uid cannot be
// read back out of it) and it is only ever meaningful next to an entitlement
// record that already names the uid.

const NAMESPACE = 'parlaid.appAccountToken.v1'

/**
 * Formats 32 hex characters as a RFC 4122 UUID, stamping the version and
 * variant bits Apple validates.
 *
 * Split out from the hashing so the formatting — which is where a stray
 * character or a wrong nibble would produce a token Apple silently drops — can
 * be tested without a native crypto module.
 */
export function uuidFromHex(hex: string): string {
  const clean = hex.toLowerCase().replace(/[^0-9a-f]/g, '')
  if (clean.length < 32) {
    throw new Error('Need at least 32 hex characters to build a UUID')
  }
  const digits = clean.slice(0, 32).split('')
  // Version 5: a name-based UUID, which is what this is.
  digits[12] = '5'
  // Variant bits: the first digit of the fourth group must be 8, 9, a or b.
  digits[16] = '89ab'[parseInt(digits[16], 16) % 4]
  const s = digits.join('')
  return [
    s.slice(0, 8),
    s.slice(8, 12),
    s.slice(12, 16),
    s.slice(16, 20),
    s.slice(20, 32),
  ].join('-')
}

export async function appAccountTokenFor(uid: string): Promise<string> {
  const hex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${NAMESPACE}:${uid}`
  )
  return uuidFromHex(hex)
}
