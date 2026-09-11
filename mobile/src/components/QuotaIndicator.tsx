import type { QuotaState } from '@shared/tiering'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import {
  colors,
  HIT_SLOP,
  PRESSED_OPACITY,
  spacing,
  typography,
} from '@/lib/theme/designTokens'

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
      <View style={styles.text}>
        <Text style={[styles.count, exhausted && styles.countExhausted]}>
          {exhausted
            ? 'No parlays left this week'
            : `${quota.remaining} of ${quota.limit} parlays left this week`}
        </Text>
        <Text style={styles.reset}>{resetLabel(quota.resetsAt)}</Text>
      </View>
      <Pressable
        onPress={onUpgrade}
        accessibilityRole="button"
        hitSlop={HIT_SLOP}
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}
      >
        <Text style={styles.linkText}>Go unlimited</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: { flex: 1, gap: spacing.xxs },
  count: {
    ...typography.label,
    color: colors.text,
    // Column-aligned digits keep the number from shifting as it counts down.
    fontVariant: ['tabular-nums'],
  },
  countExhausted: { color: colors.textSecondary },
  reset: { ...typography.caption, color: colors.textSecondary },
  link: { paddingVertical: spacing.xs },
  linkText: { ...typography.label, color: colors.secondary },
  pressed: { opacity: PRESSED_OPACITY },
})
