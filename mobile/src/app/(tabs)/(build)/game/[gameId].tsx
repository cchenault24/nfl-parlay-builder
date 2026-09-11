import { useEntitlements } from '@shared/hooks/useEntitlements'
import { useParlayGenerator } from '@shared/hooks/useParlayGenerator'
import { useGameStats, useWeekOdds, gameBookLines } from '@shared/hooks/usePregame'
import { useGamesForWeek } from '@shared/hooks/useSeason'
import { useDerivedCurrentWeek } from '@shared/hooks/useDerivedCurrentWeek'
import useParlayStore from '@shared/store/parlayStore'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'

import { ErrorBanner } from '@/components/ErrorBanner'
import UpgradeSheet from '@/components/UpgradeSheet'
import { RunSettingsRow } from '@/components/build/RunSettingsRow'
import { RunSettingsSheet } from '@/components/build/RunSettingsSheet'
import { BookLinesPanel } from '@/components/display/BookLinesPanel'
import { MatchupHero } from '@/components/display/MatchupHero'
import { MatchupRankings } from '@/components/display/MatchupRankings'
import { Button } from '@/components/ui/Button'
import { GlassSurface } from '@/components/ui/GlassSurface'
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

  const { data: games, isLoading } = useGamesForWeek(activeWeek)
  const game = games?.find(g => g.gameId === gameId)
  const { data: weekOdds } = useWeekOdds(activeWeek)
  const { data: stats } = useGameStats(gameId)

  const riskLevel = useParlayStore(state => state.riskLevel)
  const legCount = useParlayStore(state => state.legCount)
  const bookmaker = useParlayStore(state => state.bookmaker)
  const { capabilities, quota, entitlements, refetch } = useEntitlements()
  const { generate, isPending, error } = useParlayGenerator(getParlayService())

  const sportsbooks = [...(entitlements?.sportsbooks ?? [])]
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
          <ActivityIndicator color={colors.primaryBright} />
        ) : (
          <Text style={styles.muted}>That game is no longer in this week.</Text>
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
      <GlassSurface
        style={styles.actions}
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
        {costLine ? <Text style={styles.cost}>{costLine}</Text> : null}
      </GlassSurface>

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
  muted: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
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
    gap: spacing.sm,
  },
  cost: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
})
