import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import { useEffect, useState } from 'react'

import { readableAuthError } from '@/lib/auth/authErrors'
import { signInWithApple } from '@/lib/firebase'

/**
 * Sign in with Apple, for the sheet. Required by App Store review as soon as
 * any third-party sign-in (Google) is offered, and worth having on its own:
 * it is the one option that needs no password to remember.
 *
 * The nonce is generated here, hashed into Apple's request, and handed raw to
 * Firebase, which checks that the token it receives was minted for this very
 * request. A user cancelling the native sheet is not an error worth showing.
 */
export function useAppleSignIn(onError: (message: string | null) => void) {
  const [available, setAvailable] = useState(false)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let active = true
    AppleAuthentication.isAvailableAsync()
      .then(ok => {
        if (active) {
          setAvailable(ok)
        }
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  const signIn = async () => {
    onError(null)
    setPending(true)
    try {
      const rawNonce = Crypto.randomUUID()
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      )
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      })
      if (!credential.identityToken) {
        throw new Error('Apple did not return an identity token.')
      }
      await signInWithApple(credential.identityToken, rawNonce, credential.fullName)
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'ERR_REQUEST_CANCELED') {
        return
      }
      // No auto-retry: the failure is surfaced and the user decides.
      onError(readableAuthError(err))
    } finally {
      setPending(false)
    }
  }

  return { available, pending, signIn }
}
