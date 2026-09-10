import type { QuotaState } from '@shared/tiering'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, spacing } from '@/lib/theme/designTokens'

interface QuotaIndicatorProps {
  quota: QuotaState
  onUpgrade: () => void
}

function resetLabel(resetsAt: string): string {
  const days = Math.ceil((Date.parse(resetsAt) - Date.now()) / (24 * 60 * 60 * 1000))
  return days <= 1 ? 'Resets tomorrow' : `Resets in ${days} days`
}

// Pro's allowance is uncapped and its fair-use valve is deliberately never
// surfaced, so a Pro user sees nothing here — rendering "unlimited" on every
// screen would just be noise.
export default function QuotaIndicator({ quota, onUpgrade }: QuotaIndicatorProps) {
  if (quota.limit === null || quota.remaining === null) {
    return null
  }

  const exhausted = quota.remaining === 0

  return (
    <View style={styles.row}>
      <Text style={[styles.count, exhausted && styles.countExhausted]}>
        {exhausted
          ? 'No parlays left this week'
          : `${quota.remaining} of ${quota.limit} parlays left this week`}
      </Text>
      <Text style={styles.reset}>{resetLabel(quota.resetsAt)}</Text>
      <Pressable onPress={onUpgrade} accessibilityRole="button">
        <Text style={styles.link}>Go unlimited</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  count: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    // Column-aligned digits keep the number from shifting as it counts down.
    fontVariant: ['tabular-nums'],
  },
  countExhausted: {
    color: colors.textSecondary,
  },
  reset: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  link: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: '700',
  },
})
