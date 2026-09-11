import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { Button } from '@/components/ui/Button'
import { purchasePro } from '@/lib/billing/iap'
import { colors, HIT_SLOP, radius, spacing, typography } from '@/lib/theme/designTokens'

// Written as what Pro does, not as a feature matrix. Order is deliberate: the
// weekly limit is what most people hit first, and props are the strongest hook.
const PRO_FEATURES = [
  'Unlimited parlays — no weekly limit',
  'Player props, on top of the game markets',
  'Conservative, moderate and aggressive risk levels',
  'Parlays from 2 to 6 legs',
  'Price every leg on your own sportsbook',
  'Your full history, every season, with win rate and ROI',
]

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
  const [busy, setBusy] = useState(false)

  const buy = async () => {
    setBusy(true)
    setError(null)
    try {
      await purchasePro()
      onPurchased()
      onClose()
    } catch (e) {
      // No auto-retry: the failure is surfaced and the user decides.
      setError(e instanceof Error ? e.message : 'Purchase could not be completed.')
    } finally {
      setBusy(false)
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
                {canPurchase ? '$4.99 a month. Cancel any time.' : 'Not on sale yet.'}
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

            {PRO_FEATURES.map(feature => (
              <View key={feature} style={styles.featureRow}>
                <Ionicons name="checkmark" size={16} color={colors.primaryBright} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.legal}>
              For entertainment only. No wagers are placed through ParlAId.
            </Text>
          </ScrollView>

          {canPurchase ? (
            <Button
              label={busy ? 'Contacting the App Store…' : 'Upgrade'}
              onPress={buy}
              disabled={busy}
            />
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
  legal: { ...typography.micro, color: colors.textSecondary, marginTop: spacing.md },
})
