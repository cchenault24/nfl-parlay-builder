import { raisedSurface } from '@/components/ui/Card'
import Ionicons from '@expo/vector-icons/Ionicons'
import { formatOdds } from '@shared/odds'
import type { ParlayEntry } from '@shared/store/parlayStore'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Chip } from '@/components/ui/Chip'
import { currentStepLabel } from '@shared/agentSteps'
import {
  colors,
  MIN_TARGET,
  PRESSED_OPACITY,
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
  disabled = false,
}: {
  entry: ParlayEntry
  onPress: () => void
  // In select mode the tab bar is hidden for the batch bar; opening a parlay
  // from here would push a screen whose pinned bar sits on the home indicator.
  disabled?: boolean
}) {
  const matchups = entry.games?.map(g => `${g.game.away.abbrev} @ ${g.game.home.abbrev}`)
  const subtitle =
    matchups?.join(', ') ?? `${entry.gameIds.length} games`

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
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
        <Text style={styles.statusFailed}>Run failed — open to see why</Text>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    ...raisedSurface,
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
