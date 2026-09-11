import { EmptyState } from '@/components/ui/ScreenState'
import { ConfidenceBar } from '@/components/ui/ConfidenceBar'
import {
  PinnedActions,
  PINNED_ACTIONS_SPACE,
} from '@/components/ui/PinnedActions'
import { useDerivedCurrentWeek } from '@shared/hooks/useDerivedCurrentWeek'
import { useEntitlements } from '@shared/hooks/useEntitlements'
import { formatOdds } from '@shared/odds'
import useParlayStore, {
  parlayKey,
  SAVE_PARLAY_ERROR,
} from '@shared/store/parlayStore'
import { cancelParlayRun } from '@shared/hooks/useParlayGenerator'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { AgentProgress } from '@/components/display/AgentProgress'
import { GameSummaryView } from '@/components/display/GameSummaryView'
import { ParlayDisplayFooter } from '@/components/display/ParlayDisplayFooter'
import { ParlayLegView } from '@/components/display/ParlayLegView'
import { Button } from '@/components/ui/Button'
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

  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState('')

  const title = ids.length > 1 ? `${ids.length}-game parlay` : 'Parlay'

  if (!entry) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title }} />
        <EmptyState
          title="No longer in this week's working set"
          body="Saved parlays live under History."
        />
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
        {/* Deliberately not "nothing was charged". On a lost connection the
            client does not know: the server may have finished and billed the
            run after the stream dropped. Stating the rule is true in every
            case; asserting the outcome is not. The quota is refetched when a
            run fails, so the Build tab's count is the answer. */}
        <Text style={styles.muted}>
          A run only counts against your weekly parlays once it comes back with
          live book prices. Your remaining count is on the Build tab.
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
      setSaveError(SAVE_PARLAY_ERROR)
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

        <ConfidenceBar label="Overall confidence" value={parlay.parlayConfidence} />

        {/* Two independent facts, and they do not always travel together. The
            banner used to render only on `hasEstimate` (an unanchored leg) with
            the refund line nested inside it — but billing keys off the odds
            source, so a run where every leg anchored yet a game's odds degraded
            was never billed and never said so. */}
        {hasEstimate || unbilled ? (
          <ErrorBanner
            type="rate_limit_reached"
            title={hasEstimate ? 'Contains estimated prices' : 'This one was free'}
            message={[
              hasEstimate
                ? 'One or more legs are marked “Estimate” — the book hadn’t posted a line for that market, so the price is an AI estimate rather than a real one.'
                : null,
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

      <PinnedActions>
        <Button
          variant="outline"
          label={alreadySaved ? 'Saved to History' : 'Save to History'}
          icon={alreadySaved ? 'checkmark' : 'bookmark-outline'}
          loading={saving}
          disabled={alreadySaved}
          onPress={save}
        />
      </PinnedActions>
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
  body: { padding: spacing.md, gap: spacing.md, paddingBottom: PINNED_ACTIONS_SPACE },
  muted: { ...typography.bodySmall, color: colors.textSecondary },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headerText: { flex: 1, gap: spacing.xxs },
  headline: { ...typography.title, color: colors.text },
  context: { ...typography.caption, color: colors.textSecondary },
  // The number people came for, at display size and anchored to the trailing
  // edge where the eye lands last.
  odds: { ...typography.display, color: colors.primaryBright, fontVariant: ['tabular-nums'] },


  legs: { gap: spacing.sm },
})
