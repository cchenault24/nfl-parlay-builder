import Ionicons from '@expo/vector-icons/Ionicons'
import type { QuotaState } from '@shared/tiering'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import QuotaIndicator from '@/components/QuotaIndicator'
import {
  colors,
  HIT_SLOP,
  MIN_TARGET,
  PRESSED_OPACITY,
  spacing,
  typography,
} from '@/lib/theme/designTokens'

interface WeekHeaderProps {
  week: number
  gameCount: number
  builtCount: number
  selectMode: boolean
  canSelect: boolean
  quota: QuotaState | undefined
  onPickWeek: () => void
  onToggleSelectMode: () => void
  onUpgrade: (reason: string) => void
}

// "14 games · 2 parlays built". Singular matters: this sits directly above the
// quota strip, so "1 parlays built" lands next to "1 of 2 left".
export function slateSummary(gameCount: number, builtCount: number): string {
  const games = `${gameCount} game${gameCount === 1 ? '' : 's'}`
  if (builtCount === 0) {
    return games
  }
  return `${games} · ${builtCount} parlay${builtCount === 1 ? '' : 's'} built`
}

/**
 * The non-scrolling head of the Build list. The week moves here from the chip
 * strip: past weeks are locked, so a strip spent vertical space on mostly
 * unusable options (DESIGN #13).
 */
export function WeekHeader({
  week,
  gameCount,
  builtCount,
  selectMode,
  canSelect,
  quota,
  onPickWeek,
  onToggleSelectMode,
  onUpgrade,
}: WeekHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Pressable
          onPress={onPickWeek}
          accessibilityRole="button"
          accessibilityLabel={`Week ${week}. Change week`}
          style={({ pressed }) => [styles.weekButton, pressed && styles.pressed]}
        >
          <Text style={styles.title} accessibilityRole="header">
            Week {week}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </Pressable>

        {canSelect ? (
          <Pressable
            onPress={onToggleSelectMode}
            accessibilityRole="button"
            accessibilityState={{ selected: selectMode }}
            hitSlop={HIT_SLOP}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <Text style={styles.actionText}>{selectMode ? 'Done' : 'Select'}</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.summary}>{slateSummary(gameCount, builtCount)}</Text>

      {/* Pro gets null back — its allowance is uncapped and the fair-use valve
          is deliberately not surfaced as a quota. */}
      {quota && quota.limit !== null ? (
        <QuotaIndicator
          quota={quota}
          onUpgrade={() =>
            onUpgrade(
              quota.remaining === 0
                ? 'You have used this week’s parlays. Pro removes the limit.'
                : 'Pro removes the weekly limit.'
            )
          }
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, paddingBottom: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  weekButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: MIN_TARGET,
    flex: 1,
  },
  title: { ...typography.display, color: colors.text },
  action: {
    minHeight: MIN_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  actionText: { ...typography.button, color: colors.primaryBright },
  summary: { ...typography.caption, color: colors.textSecondary },
  pressed: { opacity: PRESSED_OPACITY },
})
