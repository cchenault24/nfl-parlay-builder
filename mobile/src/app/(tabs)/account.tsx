import Ionicons from '@expo/vector-icons/Ionicons'
import { Image } from 'expo-image'
import { useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { LegalDocumentSheet } from '@/components/legal/LegalDocumentSheet'
import { ResponsibleGambling } from '@/components/legal/ResponsibleGambling'
import { useAuth } from '@/lib/auth/useAuth'
import { logOut } from '@/lib/firebase'
import {
  HELPLINE,
  legalDisclaimer,
  MINIMUM_AGE,
  privacyPolicy,
  termsOfService,
  type LegalDocument,
} from '@/lib/legal/content'
import { colors, radius, spacing, typography } from '@/lib/theme/designTokens'

function Row({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
    </Pressable>
  )
}

export default function AccountScreen() {
  const { user, userProfile, error } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [document, setDocument] = useState<LegalDocument | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)

  const displayName =
    userProfile?.displayName ?? user?.displayName ?? user?.email ?? 'Signed in'

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
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

        <View style={styles.badges}>
          <View style={[styles.badge, { borderColor: colors.secondary }]}>
            <Text style={[styles.badgeText, { color: colors.secondary }]}>
              ENTERTAINMENT ONLY
            </Text>
          </View>
          <View style={[styles.badge, { borderColor: colors.error }]}>
            <Text style={[styles.badgeText, { color: colors.error }]}>
              {MINIMUM_AGE}+
            </Text>
          </View>
        </View>
        <Text style={styles.badgeCaption}>
          AI-generated analysis and parlays for entertainment. No actual betting
          occurs.
        </Text>

        <View style={styles.group}>
          <Row
            icon="document-text-outline"
            label="Terms of Service"
            onPress={() => setDocument(termsOfService)}
          />
          <Row
            icon="lock-closed-outline"
            label="Privacy Policy"
            onPress={() => setDocument(privacyPolicy)}
          />
          <Row
            icon="alert-circle-outline"
            label="Legal Disclaimer"
            onPress={() => setDocument(legalDisclaimer)}
          />
          <Row
            icon="heart-outline"
            label="Responsible gambling"
            onPress={() => setHelpOpen(true)}
          />
        </View>

        <Pressable
          onPress={() => Linking.openURL('tel:18005224700')}
          style={({ pressed }) => [styles.helpline, pressed && styles.pressed]}
        >
          <Ionicons name="call-outline" size={16} color={colors.primary} />
          <Text style={styles.helplineText}>
            Problem gambling helpline · {HELPLINE}
          </Text>
        </Pressable>

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

        <Text style={styles.copyright}>
          © {new Date().getFullYear()} ParlAId.
        </Text>
      </ScrollView>

      <LegalDocumentSheet document={document} onClose={() => setDocument(null)} />
      <ResponsibleGambling visible={helpOpen} onClose={() => setHelpOpen(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
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

  badges: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  badge: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { ...typography.label, fontSize: 11 },
  badgeCaption: { ...typography.bodySmall, fontSize: 12, color: colors.textSecondary },

  group: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rowLabel: { ...typography.body, color: colors.text, flex: 1 },

  helpline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  helplineText: { ...typography.bodySmall, color: colors.primary },

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
  copyright: { ...typography.bodySmall, fontSize: 12, color: colors.textDisabled, textAlign: 'center' },
  pressed: { opacity: 0.75 },
})
