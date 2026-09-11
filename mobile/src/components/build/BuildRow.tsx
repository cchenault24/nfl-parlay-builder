import { raisedSurface } from '@/components/ui/Card'
import { SECOND_TICK, useNow } from '@/lib/useNow'
import Ionicons from '@expo/vector-icons/Ionicons'
import { formatKickoff } from '@shared/kickoff'
import { formatOdds } from '@shared/odds'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { TeamLogo } from '@/components/display/TeamLogo'
import { Chip } from '@/components/ui/Chip'
import type { BuildRow as Row } from '@/lib/build/rowState'
import { currentStepLabel, formatElapsed, stepFraction } from '@shared/agentSteps'
import {
  colors,
  HIT_SLOP,
  MIN_TARGET,
  PRESSED_OPACITY,
  radius,
  spacing,
  typography,
} from '@/lib/theme/designTokens'

interface BuildRowProps {
  row: Row
  selectMode: boolean
  selected: boolean
  onPress: () => void
  onToggleSelect: () => void
  onCancel: () => void
}

// Ticks only while something on screen is actually running. The clock state is
// `now`, not the elapsed value: elapsed is derived during render, so changing
// which run is being timed needs no setState from inside the effect.
function useElapsed(since: number | undefined): number {
  const now = useNow(SECOND_TICK, since !== undefined)
  return since === undefined ? 0 : Math.max(0, now - since)
}

/**
 * One game, carrying its parlay's state. What makes a week shoppable: the
 * thing you are deciding about and the thing you already spent are in the same
 * place (DESIGN §4.2).
 */
export function BuildRow({
  row,
  selectMode,
  selected,
  onPress,
  onToggleSelect,
  onCancel,
}: BuildRowProps) {
  const { game, state, entry } = row
  const running = state === 'running'
  const elapsed = useElapsed(running ? entry?.startedAt : undefined)
  const closed = state === 'closed'
  // A game that has kicked off cannot be built for, but a parlay built before
  // kickoff is still the user's to open. Keyed on the entry rather than the
  // row state, which reads "closed" for both.
  const ready = entry?.status === 'ready' && Boolean(entry.parlay)
  // Re-running a game you already own costs quota for something you have.
  const selectable = !closed && state !== 'ready' && state !== 'running'
  const inert = (closed && !ready) || (selectMode && !selectable)

  const accessibilityLabel = [
    `${game.away.abbrev} at ${game.home.abbrev}`,
    formatKickoff(game.dateTime),
    ready ? 'parlay ready' : undefined,
    state === 'failed' ? 'run failed' : undefined,
    running ? 'building' : undefined,
    closed ? game.status.replace('_', ' ') : undefined,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <Pressable
      disabled={inert}
      onPress={selectMode ? onToggleSelect : onPress}
      accessibilityRole={selectMode ? 'checkbox' : 'button'}
      accessibilityState={{
        disabled: inert,
        checked: selectMode ? selected : undefined,
      }}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.row,
        ready && styles.rowReady,
        state === 'failed' && styles.rowFailed,
        closed && !ready && styles.rowClosed,
        selectMode && !selectable && styles.rowClosed,
        pressed && !inert && styles.pressed,
      ]}
    >
      <View style={styles.matchup}>
        {selectMode ? (
          <Ionicons
            name={selected ? 'radio-button-on' : 'radio-button-off'}
            size={22}
            color={selected ? colors.primaryBright : colors.textSecondary}
          />
        ) : null}
        <TeamLogo teamName={game.away.name} size="small" />
        <Text style={styles.abbrev}>{game.away.abbrev}</Text>
        <Text style={styles.at}>at</Text>
        <Text style={styles.abbrev}>{game.home.abbrev}</Text>
        <TeamLogo teamName={game.home.name} size="small" />

        <View style={styles.trailing}>
          {ready && entry?.parlay ? (
            <Chip
              label={formatOdds(entry.parlay.combinedOdds)}
              tint={colors.primaryBright}
              numeric
            />
          ) : null}
          {!selectMode && !inert ? (
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          ) : null}
        </View>
      </View>

      <Text style={styles.kickoff}>
        {formatKickoff(game.dateTime)}
        {closed ? ` · ${game.status.replace('_', ' ')}` : ''}
      </Text>

      {ready && entry?.parlay ? (
        <Text style={styles.ready}>
          {entry.parlay.legs.length}-leg parlay ready
          {entry.gameIds.length > 1 ? ` · ${entry.gameIds.length} games` : ''}
        </Text>
      ) : null}

      {running ? (
        <View style={styles.runningBlock}>
          <View style={styles.runningRow}>
            <Text style={styles.runningLabel} numberOfLines={1}>
              {currentStepLabel(entry?.steps ?? [])}
            </Text>
            <Text style={styles.elapsed}>{formatElapsed(elapsed)}</Text>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel this run"
              hitSlop={HIT_SLOP}
              style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
          <View
            style={styles.track}
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: 100,
              now: Math.round(stepFraction(entry?.steps ?? []) * 100),
            }}
          >
            <View
              style={[
                styles.fill,
                { width: `${Math.round(stepFraction(entry?.steps ?? []) * 100)}%` },
              ]}
            />
          </View>
        </View>
      ) : null}

      {state === 'failed' ? (
        <View style={styles.failedRow}>
          {/* Not "quota not spent": on a dropped connection the server may
              have finished and billed the run after the stream closed, and
              the client cannot tell. The parlay screen states the rule. */}
          <Text style={styles.failed} numberOfLines={2}>
            Run failed — tap to retry
          </Text>
          <Chip label="Retry" tint={colors.warning} />
        </View>
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
  rowReady: {
    borderColor: colors.primaryBright,
    borderWidth: 1,
    backgroundColor: colors.surfaceRaised,
  },
  rowFailed: { borderColor: colors.warning, borderWidth: 1 },
  rowClosed: { opacity: 0.45 },
  pressed: { opacity: PRESSED_OPACITY },

  matchup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  abbrev: { ...typography.title, color: colors.text },
  at: { ...typography.caption, color: colors.textSecondary },
  trailing: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  kickoff: { ...typography.caption, color: colors.textSecondary },
  ready: { ...typography.label, color: colors.primaryBright },

  runningBlock: { gap: spacing.sm, marginTop: spacing.xxs },
  runningRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  runningLabel: { ...typography.label, color: colors.text, flex: 1 },
  elapsed: { ...typography.numericSmall, color: colors.textSecondary },
  cancel: { minHeight: MIN_TARGET, justifyContent: 'center', paddingLeft: spacing.sm },
  cancelText: { ...typography.label, color: colors.textSecondary },
  track: {
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.sunken,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.primaryBright },

  failedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  failed: { ...typography.label, color: colors.warning, flex: 1 },
})
