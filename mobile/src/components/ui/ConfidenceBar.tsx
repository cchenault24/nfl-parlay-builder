import { StyleSheet, Text, View } from 'react-native'

import { colors, radius, spacing, typography } from '@/lib/theme/designTokens'

/**
 * A labelled 0–100% bar, used for both a leg's confidence and the parlay's.
 *
 * It was written twice — same five-element structure, same height, same
 * right-aligned percentage — and the two had already drifted on the one value
 * that is easiest to miss: one used `radius.pill`, the other spelled out `999`
 * twice. They render one above the other in the same scroll view, so a rounded
 * cap or a minimum visible width added to one would have been visibly absent
 * from the other.
 */
export function ConfidenceBar({
  label,
  value,
  tint = colors.primaryBright,
}: {
  label: string
  // 0–1, as the model reports it.
  value: number
  tint?: string
}) {
  const percent = Math.round(value * 100)

  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: tint }]} />
      </View>
      <Text style={styles.value}>{percent}%</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { ...typography.caption, color: colors.textSecondary },
  track: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill },
  value: {
    ...typography.numericSmall,
    color: colors.text,
    minWidth: 40,
    textAlign: 'right',
  },
})
