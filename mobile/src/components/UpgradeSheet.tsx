import Ionicons from '@expo/vector-icons/Ionicons'
import { useEntitlements } from '@shared/hooks/useEntitlements'
import { proFeatures } from '@shared/proFeatures'
import { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { Button } from '@/components/ui/Button'
import { proPrice, purchasePro, reconcilePurchases } from '@/lib/billing/iap'
import { colors, HIT_SLOP, radius, spacing, typography } from '@/lib/theme/designTokens'

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

export default function UpgradeSheet({
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
  const [price, setPrice] = useState<string | null>(null)
  const { entitlements } = useEntitlements()

  // Written from the capabilities the server sends, not from sentences with the
  // numbers spelled into them — widening a limit server-side used to leave a
  // paid feature unadvertised on both clients.
  const features = entitlements
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
      () => {}
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
      const outcome = await purchasePro()
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>ParlAId Pro</Text>
              <Text style={styles.price}>
                {!canPurchase
                  ? 'Not on sale yet.'
                  : price
                    ? `${price} a month. Cancel any time.`
                    : 'Monthly subscription. Cancel any time.'}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={HIT_SLOP}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.body}>
            {reason ? <Text style={styles.reason}>{reason}</Text> : null}

            {features.map(feature => (
              <View key={feature} style={styles.featureRow}>
                <Ionicons name="checkmark" size={16} color={colors.primaryBright} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}

            <Text style={styles.legal}>
              For entertainment only. No wagers are placed through ParlAId.
            </Text>
          </ScrollView>

          {canPurchase ? (
            <View style={styles.actions}>
              <Button
                label={busy ? 'Contacting the App Store…' : 'Upgrade'}
                onPress={buy}
                disabled={busy || restoring}
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
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.md * 2,
    borderTopRightRadius: radius.md * 2,
    padding: spacing.lg,
    maxHeight: '85%',
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
  error: { ...typography.bodySmall, color: colors.error, marginTop: spacing.md },
  notice: { ...typography.bodySmall, color: colors.text, marginTop: spacing.md },
  actions: { gap: spacing.sm },
  legal: { ...typography.micro, color: colors.textSecondary, marginTop: spacing.md },
})
