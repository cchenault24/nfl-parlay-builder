import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'

import { colors, radius, spacing, typography } from '@/lib/theme/designTokens'

interface ChipProps {
  label: string
  // Outlines and tints the chip. Defaults to the muted neutral.
  tint?: string
  // `numeric` column-aligns the digits — use it for odds, ranks and
  // percentages so they stop shifting as values change.
  numeric?: boolean
  style?: StyleProp<ViewStyle>
}

// One chip for all of them — odds, outcomes, ranks, bet types and the legal
// badges. Padding and type size live here, never at the call site.
export function Chip({ label, tint, numeric, style }: ChipProps) {
  const color = tint ?? colors.textSecondary
  return (
    <View style={[styles.chip, { borderColor: color }, style]}>
      <Text
        style={[numeric ? styles.numeric : styles.label, { color }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  label: { ...typography.micro },
  numeric: { ...typography.micro, fontVariant: ['tabular-nums'] },
})
