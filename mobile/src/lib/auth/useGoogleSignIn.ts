import { GoogleAuthProvider } from '@firebase/auth'
import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useState } from 'react'

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

/**
 * Google sign-in for iOS. The web app uses signInWithPopup, which has no
 * React Native equivalent, so this opens the system browser via
 * expo-auth-session and trades the returned id_token for a Firebase
 * credential.
 */
export function useGoogleSignIn(onError: (message: string | null) => void) {
  const [pending, setPending] = useState(false)

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId,
  })

  useEffect(() => {
    if (!response) {
      return
    }
    if (response.type === 'error') {
      onError(response.error?.message ?? 'Google sign-in failed')
      setPending(false)
      return
    }
    if (response.type !== 'success') {
      // dismiss / cancel — not an error worth showing.
      setPending(false)
      return
    }

    const idToken = response.params.id_token
    if (!idToken) {
      onError('Google did not return an id_token')
      setPending(false)
      return
    }

    signInWithGoogleCredential(GoogleAuthProvider.credential(idToken))
      .catch((err: unknown) =>
        onError(err instanceof Error ? err.message : 'Google sign-in failed')
      )
      .finally(() => setPending(false))
    // onError is a stable setter from the parent; re-running on it would
    // reprocess an already-consumed response.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response])

  return {
    disabled: !request || pending,
    signIn: () => {
      onError(null)
      setPending(true)
      promptAsync()
    },
  }
}
