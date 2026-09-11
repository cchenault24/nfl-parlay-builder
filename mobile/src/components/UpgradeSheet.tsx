import { LegalDocumentSheet } from '@/components/legal/LegalDocumentSheet'
import {
  privacyPolicy,
  termsOfService,
  type LegalDocument,
} from '@shared/legal/content'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useEntitlements } from '@shared/hooks/useEntitlements'
import { proFeatures } from '@shared/proFeatures'
import { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/Button'
import { LinkButton } from '@/components/ui/LinkButton'
import { useAuth } from '@/lib/auth/useAuth'
import { proPrice, purchasePro, reconcilePurchases } from '@/lib/billing/iap'
import {
  colors,
  HIT_SLOP,
  MIN_TARGET,
  radius,
  spacing,
  typography,
} from '@/lib/theme/designTokens'

interface UpgradeSheetProps {
  visible: boolean
  onClose: () => void
  onPurchased: () => void
  // False while Apple billing has no credentials. The features are still worth
  // showing — this is what Pro will be — but a button that can only fail is
  // worse than none.
  canPurchase: boolean
  // What the user was trying to do when they hit the lock, so the sheet opens
  // on their own intent rather than a generic pitch.
  reason?: string
}

export function UpgradeSheet({
  visible,
  onClose,
  onPurchased,
  canPurchase,
  reason,
}: UpgradeSheetProps) {
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [restoring, setRestoring] = useState(false)
  // Undefined until StoreKit answers; null once it has answered with nothing.
  // Conflating the two flashed the missing-price error on every open.
  const [price, setPrice] = useState<string | null | undefined>(undefined)
  const { entitlements } = useEntitlements()
  const { user } = useAuth()
  const insets = useSafeAreaInsets()
  const [document, setDocument] = useState<LegalDocument | null>(null)

  // Written from the capabilities the server sends, not from sentences with the
  // numbers spelled into them — widening a limit server-side used to leave a
  // paid feature unadvertised on both clients.
  // Optional-chained because the clients and the API deploy separately: a build
  // that ships before the server sends proCapabilities would otherwise throw
  // here rather than simply showing no feature list.
  const features = entitlements?.proCapabilities
    ? proFeatures(entitlements.proCapabilities, entitlements.capabilities)
    : []

  useEffect(() => {
    if (!visible || !canPurchase) {
      return
    }
    let active = true
    // StoreKit's own localized price. A hardcoded one quotes dollars to a
    // storefront that will charge pounds.
    proPrice().then(
      value => {
        if (active) {
          setPrice(value)
        }
      },
      () => {
        if (active) {
          setPrice(null)
        }
      }
    )
    return () => {
      active = false
    }
  }, [visible, canPurchase])

  const buy = async () => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const outcome = await purchasePro(user?.uid)
      if (outcome.status === 'cancelled') {
        // Their own deliberate dismissal. Saying anything about it would tell
        // them something went wrong when nothing did.
        return
      }
      if (outcome.status === 'pending') {
        setNotice(
          'Waiting for approval. Pro unlocks as soon as the purchase is approved.'
        )
        return
      }
      onPurchased()
      onClose()
    } catch (e) {
      // No auto-retry: the failure is surfaced and the user decides.
      setError(e instanceof Error ? e.message : 'Purchase could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  // Required for an auto-renewable subscription (Guideline 3.1.1), and the way
  // back for anyone whose entitlement never landed — a reinstall, a second
  // device, or a purchase whose server redemption failed after they were
  // charged.
  const restore = async () => {
    setRestoring(true)
    setError(null)
    setNotice(null)
    try {
      const redeemed = await reconcilePurchases()
      if (redeemed > 0) {
        onPurchased()
        onClose()
        return
      }
      setNotice('No previous purchase found on this Apple ID.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not restore your purchases.')
    } finally {
      setRestoring(false)
    }
  }

  // A purchase surface with no price is not one Apple lets us sell from, and a
  // button that would charge an unstated amount is worse than a disabled one.
  const priceMissing = canPurchase && price === null

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Tappable, like ui/Sheet's. A scrim that only dims is a dead end for
          anyone who reaches for the obvious way out. */}
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close ParlAId Pro"
      />
      <View style={styles.dock} pointerEvents="box-none">
        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>ParlAId Pro</Text>
              {priceMissing ? null : (
                <Text style={styles.price}>
                  {!canPurchase
                    ? 'Not on sale yet.'
                    : price
                      ? `${price} a month. Cancel any time.`
                      : 'Monthly subscription. Cancel any time.'}
                </Text>
              )}
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={HIT_SLOP}
              style={styles.close}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.body}>
            {priceMissing ? (
              <View style={styles.banner}>
                <ErrorBanner
                  type="error"
                  message="The App Store did not return a price. Try again in a moment."
                />
              </View>
            ) : null}

            {reason ? <Text style={styles.reason}>{reason}</Text> : null}

            {features.map(feature => (
              <View key={feature} style={styles.featureRow}>
                <Ionicons name="checkmark" size={16} color={colors.primaryBright} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}

            {error ? (
              <View style={styles.banner}>
                <ErrorBanner type="error" message={error} />
              </View>
            ) : null}
            {notice ? (
              <View style={styles.banner}>
                <ErrorBanner type="info" message={notice} />
              </View>
            ) : null}

            {/* Guideline 3.1.2 wants the subscription length and working links
                to the EULA and the privacy policy on the purchase surface
                itself, not only in Settings. */}
            <Text style={styles.legal}>
              For entertainment only. No wagers are placed through ParlAId. Pro
              renews monthly until cancelled, and can be cancelled any time in
              Settings &gt; your name &gt; Subscriptions.
            </Text>
            <View style={styles.legalLinks}>
              <LinkButton
                label="Terms of service"
                onPress={() => setDocument(termsOfService)}
                role="button"
                textStyle={styles.legalLink}
              />
              <Text style={styles.legalDot}>·</Text>
              <LinkButton
                label="Privacy policy"
                onPress={() => setDocument(privacyPolicy)}
                role="button"
                textStyle={styles.legalLink}
              />
            </View>
          </ScrollView>

          {canPurchase ? (
            <View style={styles.actions}>
              <Button
                label={busy ? 'Contacting the App Store…' : 'Upgrade'}
                onPress={buy}
                disabled={busy || restoring || priceMissing}
              />
              {/* Guideline 3.1.1 wants this reachable from the purchase
                  surface, not only buried in settings. */}
              <Button
                variant="neutral"
                label="Restore purchases"
                loading={restoring}
                disabled={busy}
                onPress={restore}
              />
            </View>
          ) : null}
        </View>
      </View>

      <LegalDocumentSheet document={document} onClose={() => setDocument(null)} />
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.scrim,
  },
  dock: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    // Matches ui/Sheet: never taller than most of the screen, so the scrim
    // stays a visible way out.
    maxHeight: '86%',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: { ...typography.title, color: colors.text },
  price: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xxs },
  close: {
    minWidth: MIN_TARGET,
    minHeight: MIN_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    // Pulls the 44pt box back so the glyph stays where the 24pt one sat.
    marginTop: -spacing.sm,
    marginRight: -spacing.sm,
  },
  body: {
    marginBottom: spacing.md,
  },
  reason: { ...typography.body, color: colors.text, marginBottom: spacing.md },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  featureText: { ...typography.body, color: colors.text, flex: 1 },
  actions: { gap: spacing.sm },
  banner: { marginTop: spacing.md },
  legal: { ...typography.micro, color: colors.textSecondary, marginTop: spacing.md },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  legalDot: { ...typography.micro, color: colors.textSecondary },
  legalLink: { ...typography.micro },
})
