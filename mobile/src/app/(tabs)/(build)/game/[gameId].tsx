import { EmptyState, ScreenLoading } from '@/components/ui/ScreenState'
import { PinnedActions } from '@/components/ui/PinnedActions'
import { useEntitlements } from '@shared/hooks/useEntitlements'
import { useParlayGenerator } from '@shared/hooks/useParlayGenerator'
import { useGameStats, useWeekOdds, gameBookLines } from '@shared/hooks/usePregame'
import { useGamesForWeek } from '@shared/hooks/useSeason'
import { useDerivedCurrentWeek } from '@shared/hooks/useDerivedCurrentWeek'
import useParlayStore, { parlayKey } from '@shared/store/parlayStore'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { UpgradeSheet } from '@/components/UpgradeSheet'
import { RunSettingsRow } from '@/components/build/RunSettingsRow'
import { RunSettingsSheet } from '@/components/build/RunSettingsSheet'
import { BookLinesPanel } from '@/components/display/BookLinesPanel'
import { MatchupHero } from '@/components/display/MatchupHero'
import { MatchupRankings } from '@/components/display/MatchupRankings'
import { Button } from '@/components/ui/Button'
import { getParlayService } from '@/lib/api/parlayService'
import { generationCostLine } from '@/lib/build/quotaCopy'
import {
  effectiveBookKey,
  effectiveLegCount,
  settingsSummary,
} from '@/lib/build/runSettings'
import { colors, spacing, typography } from '@/lib/theme/designTokens'

/**
 * Everything worth knowing about one matchup, reachable *before* a generation is
 * spent. That is the point: data that only appears after you have paid cannot
 * help you decide what to pay for (DESIGN #3).
 */
export default function GameDetailScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>()
  const { currentWeek } = useDerivedCurrentWeek()
  // The week the list is browsing, which is not always the live one.
  const activeWeek = useParlayStore(state => state.activeWeek) ?? currentWeek
  // The pinned bar floats over the scroll view, so the content has to reserve
  // its real height rather than a guess — a guess leaves either dead space
  // under the last panel or a panel you cannot scroll clear of.
  const [actionsHeight, setActionsHeight] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null)

  const {
    data: games,
    isLoading,
    error: gamesError,
    refetch: refetchGames,
  } = useGamesForWeek(activeWeek)
  const game = games?.find(g => g.gameId === gameId)
  const { data: weekOdds } = useWeekOdds(activeWeek)
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useGameStats(gameId)

  const riskLevel = useParlayStore(state => state.riskLevel)
  const legCount = useParlayStore(state => state.legCount)
  const bookmaker = useParlayStore(state => state.bookmaker)
  // The store, not this hook's `isPending`: a run started from the list or a
  // batch is invisible to a freshly mounted screen, and Create must not start
  // a second one for the same game.
  const entry = useParlayStore(state => state.entries[parlayKey(activeWeek, [gameId])])
  const running = entry?.status === 'running'
  const { capabilities, quota, entitlements, refetch } = useEntitlements()
  const { generate, isPending, error } = useParlayGenerator(getParlayService())

  const sportsbooks = entitlements?.sportsbooks ?? []
  const lines = gameBookLines(weekOdds?.games, gameId)?.books
  const bookKey = effectiveBookKey({ sportsbooks, capabilities, chosen: bookmaker, lines })
  const book = lines?.find(b => b.key === bookKey) ?? null
  const legs = effectiveLegCount(capabilities, legCount)
  const costLine = generationCostLine(quota)
  const quotaExhausted = quota?.remaining === 0
  // Every control the row summarises is locked on free, so the row says so.
  const gated =
    !capabilities ||
    !capabilities.chooseSportsbook ||
    capabilities.legCount.min === capabilities.legCount.max

  if (!game) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: '' }} />
        {isLoading ? (
          <ScreenLoading />
        ) : gamesError ? (
          // A failed fetch is not "no longer in this week"; it is a question
          // the schedule could not answer, and asking again is the user's call.
          <>
            <ErrorBanner
              type="error"
              title="Couldn't load this game"
              message={gamesError.message}
            />
            <Button variant="outline" label="Try again" onPress={() => void refetchGames()} />
          </>
        ) : (
          <EmptyState title="That game is no longer in this week." />
        )}
      </View>
    )
  }

  const start = () => {
    // `generate` creates the entry before it returns, so the screen being
    // pushed already has something to render.
    generate([game])
    router.push(`/parlay/${game.gameId}`)
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{ title: `${game.away.abbrev} @ ${game.home.abbrev}` }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: actionsHeight + spacing.md },
        ]}
      >
        <MatchupHero game={game} />
        <BookLinesPanel
          game={game}
          book={book}
          fellBackFrom={
            (capabilities?.chooseSportsbook ?? false) && bookmaker && bookKey !== bookmaker
              ? bookmaker
              : undefined
          }
        />
        <MatchupRankings
          game={game}
          homeStats={stats?.home ?? null}
          awayStats={stats?.away ?? null}
          status={statsLoading ? 'loading' : statsError ? 'error' : undefined}
        />
        {error ? (
          <ErrorBanner
            type="error"
            title="Parlay generation failed"
            message={error.message}
          />
        ) : null}
      </ScrollView>

      {/* Pinned, so the button that acts on this game is never below a
          screenful of the data you used to decide (DESIGN fault 1). */}
      <PinnedActions
        onLayout={e => setActionsHeight(e.nativeEvent.layout.height)}
      >
        <RunSettingsRow
          summary={settingsSummary({
            riskLevel,
            legCount: legs,
            bookTitle: sportsbooks.find(b => b.key === bookKey)?.title,
          })}
          gated={gated}
          onPress={() => setSettingsOpen(true)}
        />
        {running ? (
          <Button
            label="View progress"
            icon="hourglass-outline"
            onPress={() => router.push(`/parlay/${game.gameId}`)}
          />
        ) : (
          <Button
            label={
              quotaExhausted
                ? 'Upgrade for unlimited parlays'
                : `Create ${legs}-leg parlay`
            }
            icon="dice-outline"
            loading={isPending}
            disabled={isPending || game.status !== 'scheduled'}
            onPress={
              quotaExhausted
                ? () =>
                    setUpgradeReason(
                      'You have used this week’s parlays. Pro removes the limit.'
                    )
                : start
            }
          />
        )}
        {costLine ? <Text style={styles.cost}>{costLine}</Text> : null}
      </PinnedActions>

      <RunSettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        lines={lines}
        onUpgrade={reason => {
          setSettingsOpen(false)
          setUpgradeReason(reason)
        }}
      />

      <UpgradeSheet
        visible={upgradeReason !== null}
        onClose={() => setUpgradeReason(null)}
        onPurchased={refetch}
        canPurchase={entitlements?.billingAvailable.apple ?? false}
        reason={upgradeReason ?? undefined}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  body: { padding: spacing.md, gap: spacing.md },
  cost: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
})
