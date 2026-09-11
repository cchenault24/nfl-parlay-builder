import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter'
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query'
import { ENTITLEMENTS_QUERY_KEY } from '@shared/hooks/useEntitlements'
import { DarkTheme, Stack, ThemeProvider } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'

import { AgeVerificationGate } from '@/components/legal/AgeVerificationGate'
import { AuthProvider } from '@/lib/auth/AuthContext'
import { useAuth } from '@/lib/auth/useAuth'
import { reconcilePurchases } from '@/lib/billing/iap'
import { useAgeVerification } from '@/lib/legal/useAgeVerification'
import { installSharedRuntime } from '@/lib/runtime'
import { colors } from '@/lib/theme/designTokens'

SplashScreen.preventAutoHideAsync()
installSharedRuntime()

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primaryBright,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.divider,
  },
}

function RootNavigator() {
  const { user, loading } = useAuth()
  const queryClient = useQueryClient()
  const uid = user?.uid

  useEffect(() => {
    // Hold the splash until the first auth state lands, so a signed-in user
    // never sees the sign-in screen flash before their session restores.
    if (!loading) {
      SplashScreen.hideAsync()
    }
  }, [loading])

  useEffect(() => {
    if (!uid) {
      return
    }
    // A purchase whose server redemption failed is left unfinished on purpose,
    // and StoreKit hands it back only to an explicit getAvailablePurchases
    // sweep — no event is emitted for it. Without this pass, a user who was
    // charged while the network dropped never gets Pro and has no way to ask
    // for it. Silent because it is a background repair: it either fixes their
    // entitlement or leaves the transaction outstanding for the next launch,
    // and Restore Purchases on the Account tab is the loud version.
    let active = true
    reconcilePurchases()
      .then(redeemed => {
        if (active && redeemed > 0) {
          void queryClient.invalidateQueries({ queryKey: [ENTITLEMENTS_QUERY_KEY] })
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [uid, queryClient])

  if (loading) {
    return null
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={Boolean(user)}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })
  const { isVerified, isLoading: ageLoading, setVerified } = useAgeVerification()

  useEffect(() => {
    // The age gate owns the splash while it is the thing on screen; the
    // navigator hides it in the verified path.
    if (fontsLoaded && !ageLoading && !isVerified) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, ageLoading, isVerified])

  if (!fontsLoaded || ageLoading) {
    return null
  }

  // Deliberately ahead of AuthProvider: an unverified user must not reach
  // sign-in, betting content, or any network call that implies either.
  if (!isVerified) {
    return (
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="light" />
        <AgeVerificationGate onVerified={setVerified} />
      </ThemeProvider>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navigationTheme}>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
