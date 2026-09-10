import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { purchasePro } from '@/lib/billing/iap'
import { colors, radius, spacing } from '@/lib/theme/designTokens'

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
  // What the user was trying to do when they hit the lock, so the sheet opens
  // on their own intent rather than a generic pitch.
  reason?: string
}

export default function UpgradeSheet({
  visible,
  onClose,
  onPurchased,
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
              <Text style={styles.price}>$4.99 a month. Cancel any time.</Text>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.body}>
            {reason ? <Text style={styles.reason}>{reason}</Text> : null}

            {PRO_FEATURES.map(feature => (
              <View key={feature} style={styles.featureRow}>
                <Ionicons name="checkmark" size={16} color={colors.primary} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.legal}>
              For entertainment only. No wagers are placed through ParlAId.
            </Text>
          </ScrollView>

          <Pressable
            onPress={buy}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cta,
              pressed && styles.ctaPressed,
              busy && styles.ctaDisabled,
            ]}
          >
            <Text style={styles.ctaText}>{busy ? 'Contacting the App Store…' : 'Upgrade'}</Text>
          </Pressable>
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
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  price: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  body: {
    marginBottom: spacing.md,
  },
  reason: {
    color: colors.text,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  featureText: {
    color: colors.text,
    fontSize: 14,
    flex: 1,
  },
  error: {
    color: colors.error,
    fontSize: 13,
    marginTop: spacing.md,
  },
  legal: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: spacing.md,
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  ctaPressed: {
    backgroundColor: colors.primaryMuted,
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
})
