import Ionicons from '@expo/vector-icons/Ionicons'
import { formatOdds } from '@shared/odds'
import type { ParlayEntry } from '@shared/store/parlayStore'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Chip } from '@/components/ui/Chip'
import { currentStepLabel } from '@/lib/build/steps'
import {
  colors,
  MIN_TARGET,
  PRESSED_OPACITY,
  radius,
  spacing,
  typography,
} from '@/lib/theme/designTokens'

/**
 * A parlay that spans several games belongs to no single row, so it sits above
 * the list. Without this it would be built, navigated to, and then unreachable
 * the moment the app was relaunched.
 */
export function CrossGameRow({
  entry,
  onPress,
}: {
  entry: ParlayEntry
  onPress: () => void
}) {
  const matchups = entry.games?.map(g => `${g.game.away.abbrev} @ ${g.game.home.abbrev}`)
  const subtitle =
    matchups?.join(', ') ?? `${entry.gameIds.length} games`

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Cross-game parlay across ${entry.gameIds.length} games. ${subtitle}`}
      style={({ pressed }) => [
        styles.row,
        entry.status === 'ready' && styles.ready,
        entry.status === 'failed' && styles.failed,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.head}>
        <Ionicons name="git-merge-outline" size={18} color={colors.primaryBright} />
        <Text style={styles.title}>Cross-game · {entry.gameIds.length} games</Text>
        {entry.status === 'ready' && entry.parlay ? (
          <Chip
            label={formatOdds(entry.parlay.combinedOdds)}
            tint={colors.primaryBright}
            numeric
          />
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      </View>
      <Text style={styles.subtitle} numberOfLines={2}>
        {subtitle}
      </Text>
      {entry.status === 'running' ? (
        <Text style={styles.status}>{currentStepLabel(entry.steps)}</Text>
      ) : null}
      {entry.status === 'failed' ? (
        <Text style={styles.statusFailed}>Run failed — quota not spent</Text>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.xs,
    minHeight: MIN_TARGET,
  },
  ready: {
    borderColor: colors.primaryBright,
    borderWidth: 1,
    backgroundColor: colors.surfaceRaised,
  },
  failed: { borderColor: colors.warning, borderWidth: 1 },
  pressed: { opacity: PRESSED_OPACITY },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.title, color: colors.text, flex: 1 },
  subtitle: { ...typography.caption, color: colors.textSecondary },
  status: { ...typography.label, color: colors.text },
  statusFailed: { ...typography.label, color: colors.warning },
})
