import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, StyleSheet, Text } from 'react-native'

import { useGoogleSignIn } from '@/lib/auth/useGoogleSignIn'
import {
  colors,
  MIN_TARGET,
  PRESSED_OPACITY,
  radius,
  spacing,
  typography,
} from '@/lib/theme/designTokens'

// Only mount this when googleSignInConfigured is true — the auth-session hook
// inside useGoogleSignIn throws during render without an iOS client id.
export function GoogleSignInButton({
  onError,
}: {
  onError: (message: string | null) => void
}) {
  const google = useGoogleSignIn(onError)

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        (pressed || google.disabled) && styles.pressed,
      ]}
      onPress={google.signIn}
      disabled={google.disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: google.disabled }}
    >
      <Ionicons name="logo-google" size={20} color={colors.text} />
      <Text style={styles.text}>Continue with Google</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: MIN_TARGET + 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  text: { ...typography.button, color: colors.text },
  pressed: { opacity: PRESSED_OPACITY },
})
