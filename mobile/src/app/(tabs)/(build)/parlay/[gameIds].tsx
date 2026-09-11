import { useDerivedCurrentWeek } from '@shared/hooks/useDerivedCurrentWeek'
import { useEntitlements } from '@shared/hooks/useEntitlements'
import { formatOdds } from '@shared/odds'
import useParlayStore, { parlayKey } from '@shared/store/parlayStore'
import { cancelParlayRun } from '@shared/hooks/useParlayGenerator'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, InteractionManager, ScrollView, StyleSheet, Text, View } from 'react-native'

import { ErrorBanner } from '@/components/ErrorBanner'
import { AgentProgress } from '@/components/display/AgentProgress'
import { GameSummaryView } from '@/components/display/GameSummaryView'
import { ParlayDisplayFooter } from '@/components/display/ParlayDisplayFooter'
import { ParlayLegView } from '@/components/display/ParlayLegView'
import { Button } from '@/components/ui/Button'
import { GlassSurface } from '@/components/ui/GlassSurface'
import { useAuth } from '@/lib/auth/useAuth'
import { unbilledNotice } from '@/lib/build/quotaCopy'
import { saveParlayToUser } from '@/lib/parlays'
import { colors, spacing, typography } from '@/lib/theme/designTokens'

/**
 * The result, on its own screen with the whole viewport. Building and ready are
 * the same screen in two states, so the timeline you watched becomes the parlay
 * you asked for rather than being replaced by it (DESIGN #4, #9).
 */
export default function ParlayDetailScreen() {
  const { gameIds } = useLocalSearchParams<{ gameIds: string }>()
  const { currentWeek } = useDerivedCurrentWeek()
  const activeWeek = useParlayStore(state => state.activeWeek) ?? currentWeek
  const { user } = useAuth()
  const { quota } = useEntitlements()

  const ids = (gameIds ?? '').split('+').filter(Boolean)
  const key = parlayKey(activeWeek, ids)
  const entry = useParlayStore(state => state.entries[key])
  const clearRun = useParlayStore(state => state.clearRun)

  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState('')

  const title = ids.length > 1 ? `${ids.length}-game parlay` : 'Parlay'

  if (!entry) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title }} />
        <Text style={styles.muted}>
          This parlay is no longer in this week&apos;s working set. Saved parlays live
          under History.
        </Text>
      </View>
    )
  }

  if (entry.status === 'running') {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Building' }} />
        <ScrollView contentContainerStyle={styles.body}>
          <AgentProgress
            steps={entry.steps}
            gameCount={entry.gameIds.length}
            startedAt={entry.startedAt}
            // Stops the run itself, not just this screen's view of it — the
            // controller is keyed by run, so the screen that started it does
            // not have to be the one that cancels it.
            onCancel={() => cancelParlayRun(key)}
          />
        </ScrollView>
      </View>
    )
  }

  if (entry.status === 'failed' || !entry.parlay) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title }} />
        <ErrorBanner
          type="error"
          title="Parlay generation failed"
          message={entry.error ?? 'The run ended without a parlay.'}
        />
        <Text style={styles.muted}>
          Nothing was charged for this — a run only counts once it comes back with
          live book prices.
        </Text>
      </View>
    )
  }

  const parlay = entry.parlay
  const alreadySaved = savedId === parlay.parlayId
  const hasEstimate = parlay.legs.some(leg => !leg.anchored)
  const unbilled = unbilledNotice(entry.games, quota)
  const contextFor = (gameId: string) => {
    const game = entry.games?.find(g => g.game.gameId === gameId)?.game
    return game ? `${game.away.name} @ ${game.home.name} — Week ${game.week}` : parlay.gameContext
  }

  const discard = () => {
    router.back()
    // Removing the entry takes this screen's subject away, so do it once the
    // pop has finished — clearing it first re-renders the screen into the
    // "no longer in this week's working set" message while it slides away.
    InteractionManager.runAfterInteractions(() => clearRun(key))
  }

  const confirmDiscard = () => {
    Alert.alert(
      'Discard this parlay?',
      alreadySaved
        ? 'It stays under History. This only clears it from this week\u2019s board.'
        : 'It was never saved to History, so it is gone. Building it again spends another generation.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: discard },
      ]
    )
  }

  const save = async () => {
    if (!user) {
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      await saveParlayToUser(user.uid, parlay)
      setSavedId(parlay.parlayId)
    } catch {
      setSaveError('Failed to save parlay. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title }} />

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.headline} accessibilityRole="header">
              {parlay.legs.length}-leg parlay
            </Text>
            <Text style={styles.context}>{parlay.gameContext}</Text>
          </View>
          <Text style={styles.odds}>{formatOdds(parlay.combinedOdds)}</Text>
        </View>

        <View style={styles.confidenceRow}>
          <Text style={styles.confidenceLabel}>Overall confidence</Text>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${Math.round(parlay.parlayConfidence * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.confidenceValue}>
            {Math.round(parlay.parlayConfidence * 100)}%
          </Text>
        </View>

        {hasEstimate ? (
          <ErrorBanner
            type="rate_limit_reached"
            title="Contains estimated prices"
            message={[
              'One or more legs are marked “Estimate” — the book hadn’t posted a line for that market, so the price is an AI estimate rather than a real one.',
              unbilled,
            ]
              .filter(Boolean)
              .join(' ')}
          />
        ) : null}

        {parlay.gameSummary.slateSummary ? (
          <ErrorBanner
            type="info"
            title="Across these games"
            message={parlay.gameSummary.slateSummary}
          />
        ) : null}

        {parlay.gameSummary.games.map(analysis => (
          <GameSummaryView
            key={analysis.gameId}
            analysis={analysis}
            gameContext={contextFor(analysis.gameId)}
            collapsedByDefault
          />
        ))}

        <View style={styles.legs}>
          {parlay.legs.map((leg, index) => (
            <ParlayLegView
              key={`${parlay.parlayId}-${leg.betType}-${leg.selection}`}
              leg={leg}
              index={index}
            />
          ))}
        </View>

        {saveError ? (
          <ErrorBanner type="error" title="Failed to save parlay" message={saveError} />
        ) : null}
        {alreadySaved ? (
          <ErrorBanner
            type="success"
            title="Parlay saved"
            message="Find it under the History tab."
          />
        ) : null}

        <ParlayDisplayFooter parlay={parlay} />
      </ScrollView>

      <GlassSurface style={styles.actions}>
        <View style={styles.actionRow}>
          <Button
            variant="outline"
            label={alreadySaved ? 'Saved to History' : 'Save to History'}
            icon={alreadySaved ? 'checkmark' : 'bookmark-outline'}
            loading={saving}
            disabled={alreadySaved}
            onPress={save}
            style={styles.saveAction}
          />
          <Button
            variant="danger"
            iconOnly
            icon="trash-outline"
            label="Discard parlay"
            onPress={confirmDiscard}
            style={styles.discardAction}
          />
        </View>
      </GlassSurface>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  body: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl * 3 },
  muted: { ...typography.bodySmall, color: colors.textSecondary },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headerText: { flex: 1, gap: spacing.xxs },
  headline: { ...typography.title, color: colors.text },
  context: { ...typography.caption, color: colors.textSecondary },
  // The number people came for, at display size and anchored to the trailing
  // edge where the eye lands last.
  odds: { ...typography.display, color: colors.primaryBright, fontVariant: ['tabular-nums'] },

  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  confidenceLabel: { ...typography.caption, color: colors.textSecondary },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 999, backgroundColor: colors.primaryBright },
  confidenceValue: {
    ...typography.numericSmall,
    color: colors.text,
    minWidth: 40,
    textAlign: 'right',
  },

  legs: { gap: spacing.sm },
  // No safe-area inset here. This bar is pinned to the bottom of a screen
  // inside the tab navigator, so the tab bar already sits between it and the
  // home indicator and has already absorbed that inset — adding it again pads
  // for a gap something else is filling.
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    padding: spacing.md,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  saveAction: { flex: 1 },
  // Neutral container, red glyph. The border is what makes it read as a button
  // beside the bordered Save; keeping it neutral is what keeps it from
  // outweighing the safe action next to it.
  discardAction: { borderWidth: 1, borderColor: colors.border },
})
