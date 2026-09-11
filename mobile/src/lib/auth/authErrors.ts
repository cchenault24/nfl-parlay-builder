interface FirebaseAuthError {
  code?: string
  message?: string
}

/**
 * Turns a Firebase auth failure into something a person can read —
 * `auth/invalid-credential` becomes `invalid credential`.
 *
 * Lives here rather than beside the sheet that renders it because it is the
 * only thing standing between a user and a raw Firebase code, and it needs to
 * be exercised: the `code` path, the `message` fallback for an error that
 * carries no code, and the final fallback for something that is not a Firebase
 * error at all.
 */
const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'That email and password do not match.',
  'auth/invalid-email': 'That does not look like an email address.',
  'auth/user-not-found': 'No account uses that email.',
  'auth/wrong-password': 'That email and password do not match.',
  'auth/email-already-in-use': 'An account already uses that email. Sign in instead.',
  'auth/weak-password': 'Choose a longer password — at least six characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': 'No connection. Check your network and try again.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/requires-recent-login': 'Sign in again to continue.',
}

export function readableAuthError(err: unknown): string {
  const authError = (err ?? {}) as FirebaseAuthError
  const code = authError.code
  if (code && MESSAGES[code]) {
    return MESSAGES[code]
  }
  // Unmapped codes still read as words rather than as `auth/foo-bar`; the raw
  // message is a last resort for an error that is not Firebase's at all.
  return (
    code?.replace('auth/', '').replace(/-/g, ' ') ||
    authError.message ||
    'Authentication failed'
  )
}
