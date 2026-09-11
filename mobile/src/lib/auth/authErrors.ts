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
export function readableAuthError(err: unknown): string {
  const authError = (err ?? {}) as FirebaseAuthError
  return (
    authError.code?.replace('auth/', '').replace(/-/g, ' ') ||
    authError.message ||
    'Authentication failed'
  )
}
