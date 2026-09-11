import { ScreenLoading } from '@/components/ui/ScreenState'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Image } from 'expo-image'
import { useState } from 'react'
import {
  Alert,
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
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { LinkButton } from '@/components/ui/LinkButton'
import { UpgradeSheet } from '@/components/UpgradeSheet'
import { AccountService } from '@shared/api/AccountService'
import { useEntitlements } from '@shared/hooks/useEntitlements'
import { sharedRuntime } from '@shared/runtime'
import { useAuth } from '@/lib/auth/useAuth'
import { reconcilePurchases } from '@/lib/billing/iap'
import { logOut } from '@/lib/firebase'
import {
  HELPLINE,
  legalDisclaimer,
  MINIMUM_AGE,
  privacyPolicy,
  termsOfService,
  type LegalDocument,
} from '@shared/legal/content'
import {
  colors,
  PRESSED_OPACITY,
  radius,
  spacing,
  typography,
} from '@/lib/theme/designTokens'

function Row({
  icon,
  label,
  onPress,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  last?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, last && styles.rowLast, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
    </Pressable>
  )
}

const accounts = new AccountService()

export default function AccountScreen() {
  const { user, userProfile, error, loading } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [document, setDocument] = useState<LegalDocument | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const { isPro, entitlements, refetch: refetchEntitlements } = useEntitlements()

  const displayName =
    userProfile?.displayName ?? user?.displayName ?? user?.email ?? 'Signed in'

  // Guideline 3.1.1 requires this for an auto-renewable subscription, and it is
  // the only way back for a reinstall, a second device, or a purchase whose
  // server redemption failed after the user was charged.
  const restore = async () => {
    setRestoring(true)
    try {
      const redeemed = await reconcilePurchases()
      await refetchEntitlements()
      Alert.alert(
        redeemed > 0 ? 'Purchases restored' : 'Nothing to restore',
        redeemed > 0
          ? 'Your Pro subscription is active on this device.'
          : 'No previous purchase was found on this Apple ID.'
      )
    } catch (e) {
      // No auto-retry: the failure is surfaced and the user decides.
      Alert.alert(
        'Could not restore your purchases',
        e instanceof Error ? e.message : 'Please try again.'
      )
    } finally {
      setRestoring(false)
    }
  }

  const deleteAccount = async () => {
    setDeleting(true)
    try {
      const token = await sharedRuntime().getIdToken()
      if (!token) {
        throw new Error('Please sign in again to delete your account.')
      }
      const result = await accounts.deleteAccount(token)
      await logOut()
      // The account is gone but the subscription is not: neither store cancels
      // one because an account disappeared. Said after the fact as well as
      // before, because this is the last moment we can tell them.
      if (result.subscriptionStillActive === 'iap') {
        Alert.alert(
          'Account deleted',
          'Your Pro subscription is still active. Cancel it in Settings > your name > Subscriptions, or you will keep being charged.'
        )
      } else if (result.subscriptionStillActive) {
        Alert.alert(
          'Account deleted',
          'Your Pro subscription is still active. Cancel it from the billing portal, or you will keep being charged.'
        )
      }
    } catch (e) {
      // No auto-retry: the failure is surfaced and the user decides.
      setDeleting(false)
      Alert.alert(
        'Could not delete your account',
        e instanceof Error ? e.message : 'Please try again.'
      )
    }
  }

  // Two taps, and the destructive one is not the default. This is the only
  // action in the app that cannot be undone.
  const confirmDelete = () =>
    Alert.alert(
      'Delete your account?',
      'This removes your profile, every parlay you have saved and your generation history. It cannot be undone.\n\nParlays you shared with a link stay reachable by that link — they carry no name or account.' +
        // Disclosed, never used to refuse: 5.1.1(v) requires deletion to be
        // available in the app, and Apple treats blocking it behind a live
        // subscription as a rejection.
        (isPro
          ? '\n\nYour Pro subscription is not cancelled by this. Cancel it in Settings > your name > Subscriptions, or you will keep being charged.'
          : ''),
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteAccount },
      ]
    )

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.screenTitle} accessibilityRole="header">
          Account
        </Text>

        {/* The screen used to render fully while auth resolved, showing an empty
            name and no avatar where the account details belong. */}
        {loading ? <ScreenLoading /> : null}

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
          <ErrorBanner type="error" message={error.message} />
        ) : null}

        <View style={styles.badges}>
          <Chip label="ENTERTAINMENT ONLY" tint={colors.secondary} />
          <Chip label={`${MINIMUM_AGE}+`} tint={colors.error} />
        </View>
        <Text style={styles.badgeCaption}>
          AI-generated analysis and parlays for entertainment. No actual betting
          occurs.
        </Text>

        {/* The plan, on the one screen about the account. Without it a Pro
            user had nowhere to see that they were Pro or to reach the
            subscription, and a free user had no upgrade path here. */}
        {entitlements ? (
          <Card style={styles.plan}>
            <View style={styles.planRow}>
              <Text style={styles.planTitle}>{isPro ? 'Pro plan' : 'Free plan'}</Text>
              {isPro ? <Chip label="PRO" tint={colors.secondary} /> : null}
            </View>
            {isPro ? (
              <>
                <Text style={styles.planBody}>
                  {entitlements.accessEndsAt
                    ? `Access ends ${new Date(entitlements.accessEndsAt).toLocaleDateString()}.`
                    : 'Every risk level, leg count and sportsbook, with no weekly limit.'}
                </Text>
                {/* Apple's page, because that is where an App Store
                    subscription is cancelled; a web subscription is managed
                    from the site, and the entitlement does not say which. */}
                <LinkButton
                  label="Manage subscription"
                  icon="open-outline"
                  onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
                  style={styles.planLink}
                />
              </>
            ) : (
              <>
                <Text style={styles.planBody}>
                  Pro removes the weekly limit and unlocks every risk level, leg
                  count and sportsbook.
                </Text>
                <Button label="Upgrade to Pro" onPress={() => setUpgradeOpen(true)} />
              </>
            )}
          </Card>
        ) : null}

        <Card padded={false} style={styles.group}>
          <Row
            icon="document-text-outline"
            label="Terms of service"
            onPress={() => setDocument(termsOfService)}
          />
          <Row
            icon="lock-closed-outline"
            label="Privacy policy"
            onPress={() => setDocument(privacyPolicy)}
          />
          <Row
            icon="alert-circle-outline"
            label="Legal disclaimer"
            onPress={() => setDocument(legalDisclaimer)}
          />
          <Row
            icon="heart-outline"
            label="Responsible gambling"
            onPress={() => setHelpOpen(true)}
            last
          />
        </Card>

        <LinkButton
          icon="call-outline"
          label={`Problem gambling helpline · ${HELPLINE}`}
          onPress={() => Linking.openURL('tel:18005224700')}
          textStyle={styles.helplineText}
          style={styles.helpline}
        />

        <Button
          variant="neutral"
          label="Restore purchases"
          loading={restoring}
          disabled={signingOut || deleting}
          onPress={restore}
        />

        <Button
          variant="neutral"
          label="Sign out"
          loading={signingOut}
          onPress={async () => {
            setSigningOut(true)
            try {
              await logOut()
            } finally {
              setSigningOut(false)
            }
          }}
        />

        {/* Red, but borderless: marked as destructive without out-shouting
            the safe action above it. */}
        <Button
          variant="danger"
          label="Delete account"
          loading={deleting}
          disabled={signingOut}
          onPress={confirmDelete}
        />

        <Text style={styles.copyright}>
          © {new Date().getFullYear()} ParlAId.
        </Text>
      </ScrollView>

      <LegalDocumentSheet document={document} onClose={() => setDocument(null)} />
      <UpgradeSheet
        visible={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        onPurchased={refetchEntitlements}
        canPurchase={entitlements?.billingAvailable.apple ?? false}
      />
      <ResponsibleGambling visible={helpOpen} onClose={() => setHelpOpen(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  screenTitle: { ...typography.heading, color: colors.text },
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


  badges: { flexDirection: 'row', gap: spacing.sm },
  badgeCaption: { ...typography.caption, color: colors.textSecondary },

  plan: { gap: spacing.sm },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  planTitle: { ...typography.title, color: colors.text, flex: 1 },
  planBody: { ...typography.bodySmall, color: colors.textSecondary },
  planLink: { alignSelf: 'flex-start' },
  group: { overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { ...typography.body, color: colors.text, flex: 1 },

  helpline: { alignSelf: 'flex-start', gap: spacing.sm },
  helplineText: { ...typography.bodySmall },

  copyright: { ...typography.caption, color: colors.textDisabled, textAlign: 'center' },
  pressed: { opacity: PRESSED_OPACITY },
})
