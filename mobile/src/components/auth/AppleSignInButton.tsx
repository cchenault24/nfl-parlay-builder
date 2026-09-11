import * as AppleAuthentication from 'expo-apple-authentication'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { useAppleSignIn } from '@/lib/auth/useAppleSignIn'
import { colors, MIN_TARGET, radius } from '@/lib/theme/designTokens'

// Apple's own button, not ours: the guidelines want its exact mark and copy,
// and the native view draws both. Sized to match Button so the column reads as
// one set of options.
export function AppleSignInButton({
  onError,
}: {
  onError: (message: string | null) => void
}) {
  const apple = useAppleSignIn(onError)
  if (!apple.available) {
    return null
  }
  return (
    <View style={styles.wrap}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={radius.md}
        style={styles.button}
        onPress={() => void apple.signIn()}
      />
      {apple.pending ? (
        <View style={styles.busy} pointerEvents="none">
          <ActivityIndicator color={colors.background} />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  button: { width: '100%', height: MIN_TARGET + 8 },
  busy: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
})
