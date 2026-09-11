import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import {
  colors,
  MIN_TARGET,
  PRESSED_OPACITY,
  radius,
  spacing,
  typography,
} from '@/lib/theme/designTokens'

interface RunSettingsRowProps {
  summary: string
  // True when any of what the row summarises is gated on this plan, so the row
  // says the settings exist without pretending they are all reachable.
  gated: boolean
  onPress: () => void
}

// One line standing in for three controls, right above the button they modify.
export function RunSettingsRow({ summary, gated, onPress }: RunSettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Run settings: ${summary}`}
      accessibilityHint="Opens risk, leg count and sportsbook"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Ionicons name="options-outline" size={18} color={colors.textSecondary} />
      <Text style={styles.summary} numberOfLines={1}>
        {summary}
      </Text>
      {gated ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PRO</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TARGET,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    backgroundColor: colors.sunken,
  },
  summary: { ...typography.label, color: colors.text, flex: 1 },
  pressed: { opacity: PRESSED_OPACITY },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.secondary,
  },
  badgeText: {
    ...typography.micro,
    fontSize: 10,
    letterSpacing: 0.4,
    color: colors.background,
  },
})
