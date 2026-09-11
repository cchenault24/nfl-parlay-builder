import { GoogleAuthProvider } from '@firebase/auth'
import type { AuthSessionResult } from 'expo-auth-session'
import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useRef, useState } from 'react'

import { signInWithGoogleCredential } from '@/lib/firebase'

// Lets the auth session close the in-app browser when it redirects back.
WebBrowser.maybeCompleteAuthSession()

const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID

/**
 * Whether Google sign-in can work at all. Callers must check this BEFORE
 * mounting anything that calls useGoogleSignIn: the underlying
 * expo-auth-session hook throws during render when iosClientId is missing,
 * so gating the button alone is not enough — the component holding the hook
 * must not mount.
 */
export const googleSignInConfigured = Boolean(iosClientId)

// How long the library's own code exchange gets after the browser hands back
// a code. Its `performAsync(...).then(setFullResult)` has no rejection path, so
// a failed exchange never publishes a `response` and, without this, the button
// spun forever with nothing to say.
const EXCHANGE_TIMEOUT_MS = 30_000

// A success carrying no id_token is not finished: on native the library sets
// `response` only once its own code exchange resolves, and this guards the case
// where it publishes an intermediate value instead.
function isSettled(result: AuthSessionResult): boolean {
  return result.type !== 'success' || Boolean(result.params.id_token)
}

/**
 * Google sign-in for iOS. The web app uses signInWithPopup, which has no
 * React Native equivalent, so this opens the system browser via
 * expo-auth-session and trades the returned id_token for a Firebase
 * credential.
 *
 * The outcome is taken from the hook's `response`, NOT from the promise
 * `promptAsync()` returns. On native `useIdTokenAuthRequest` is a PKCE *code*
 * flow — it asks for an id_token directly only on web — so that promise
 * resolves with `params.code` and no `id_token` at all. The token appears later
 * on `response`, once the library's own effect has exchanged the code. Reading
 * the promise instead makes every sign-in on a real device fail with "Google
 * did not return an id_token".
 *
 * `response` is bridged back to the handler that asked for it rather than
 * handled in an effect, so the pending flag is set and cleared in one place —
 * and so the React Compiler's ban on setState inside an effect body is not
 * something this has to work around.
 */
export function useGoogleSignIn(onError: (message: string | null) => void) {
  const [pending, setPending] = useState(false)

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId,
  })

  const waiting = useRef<((result: AuthSessionResult) => void) | null>(null)

  useEffect(() => {
    if (response && isSettled(response) && waiting.current) {
      const resolve = waiting.current
      waiting.current = null
      resolve(response)
    }
  }, [response])

  const signIn = async () => {
    onError(null)
    setPending(true)
    try {
      // Armed before the prompt, so a redirect that comes back fast cannot
      // land before there is anything to receive it.
      const settled = new Promise<AuthSessionResult>(resolve => {
        waiting.current = resolve
      })
      const prompted = await promptAsync()
      if (prompted.type !== 'success') {
        // dismiss / cancel / error straight from the browser: nothing is
        // being exchanged, so there is nothing to wait for.
        if (prompted.type === 'error') {
          onError(prompted.error?.message ?? 'Google sign-in failed')
        }
        return
      }
      const result = await Promise.race([
        settled,
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Google sign-in did not finish. Please try again.')),
            EXCHANGE_TIMEOUT_MS
          )
        ),
      ])

      if (result.type === 'error') {
        onError(result.error?.message ?? 'Google sign-in failed')
        return
      }
      if (result.type !== 'success') {
        // dismiss / cancel — not an error worth showing.
        return
      }
      await signInWithGoogleCredential(
        GoogleAuthProvider.credential(result.params.id_token)
      )
    } catch (err: unknown) {
      // No auto-retry: the failure is surfaced and the user decides.
      onError(err instanceof Error ? err.message : 'Google sign-in failed')
    } finally {
      waiting.current = null
      setPending(false)
    }
  }

  return {
    disabled: !request || pending,
    signIn,
  }
}
