import { GoogleAuthProvider } from '@firebase/auth'
import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'

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

  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId,
  })

  // Handled on the promise promptAsync returns rather than on the hook's
  // `response` state. It is the same result, but it arrives in the handler that
  // asked for it, so clearing `pending` no longer costs a second render pass
  // through an effect.
  const signIn = async () => {
    onError(null)
    setPending(true)
    try {
      const result = await promptAsync()
      if (result.type === 'error') {
        onError(result.error?.message ?? 'Google sign-in failed')
        return
      }
      if (result.type !== 'success') {
        // dismiss / cancel — not an error worth showing.
        return
      }
      const idToken = result.params.id_token
      if (!idToken) {
        onError('Google did not return an id_token')
        return
      }
      await signInWithGoogleCredential(GoogleAuthProvider.credential(idToken))
    } catch (err: unknown) {
      // No auto-retry: the failure is surfaced and the user decides.
      onError(err instanceof Error ? err.message : 'Google sign-in failed')
    } finally {
      setPending(false)
    }
  }

  return {
    disabled: !request || pending,
    signIn,
  }
}
