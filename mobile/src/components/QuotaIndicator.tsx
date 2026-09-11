import {
  quotaRemainingLabel,
  quotaResetLabel,
} from '@shared/rateLimits'
import type { QuotaState } from '@shared/tiering'
import { StyleSheet, Text, View } from 'react-native'

import { LinkButton } from '@/components/ui/LinkButton'
import { colors, spacing, typography } from '@/lib/theme/designTokens'

interface QuotaIndicatorProps {
  quota: QuotaState
  onUpgrade: () => void
}

// Pro's allowance is uncapped and its fair-use valve is deliberately never
// surfaced, so a Pro user sees nothing here — rendering "unlimited" on every
// screen would just be noise.
export function QuotaIndicator({ quota, onUpgrade }: QuotaIndicatorProps) {
  if (quota.limit === null || quota.remaining === null) {
    return null
  }

  const exhausted = quota.remaining === 0

  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={[styles.count, exhausted && styles.countExhausted]}>
          {quotaRemainingLabel(quota.remaining, quota.limit)}
        </Text>
        <Text style={styles.reset}>{quotaResetLabel(quota.resetsAt)}</Text>
      </View>
      <LinkButton
        label="Go unlimited"
        onPress={onUpgrade}
        role="button"
        tint={colors.secondary}
      />
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
})
