import Ionicons from '@expo/vector-icons/Ionicons'
import { Image } from 'expo-image'
import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuth } from '@/lib/auth/useAuth'
import { logOut } from '@/lib/firebase'
import { colors, radius, spacing, typography } from '@/lib/theme/designTokens'

export default function AccountScreen() {
  const { user, userProfile, error } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const displayName =
    userProfile?.displayName ?? user?.displayName ?? user?.email ?? 'Signed in'

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.body}>
        <View style={styles.identity}>
          {userProfile?.photoURL ? (
            <Image source={{ uri: userProfile.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={28} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.identityText}>
            <Text style={styles.name}>{displayName}</Text>
            {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error.message}</Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
          onPress={async () => {
            setSigningOut(true)
            try {
              await logOut()
            } finally {
              setSigningOut(false)
            }
          }}
          disabled={signingOut}
        >
          {signingOut ? (
            <ActivityIndicator color={colors.error} />
          ) : (
            <Text style={styles.signOutText}>Sign out</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, padding: spacing.md, gap: spacing.lg },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: radius.pill },
  avatarFallback: {
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: { flex: 1, gap: spacing.xs },
  name: { ...typography.title, color: colors.text },
  email: { ...typography.bodySmall, color: colors.textSecondary },
  errorBox: {
    backgroundColor: 'rgba(244, 67, 54, 0.12)',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: { ...typography.bodySmall, color: colors.error },
  signOut: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error,
    minHeight: 52,
    justifyContent: 'center',
  },
  signOutText: { ...typography.button, color: colors.error },
  pressed: { opacity: 0.75 },
})
