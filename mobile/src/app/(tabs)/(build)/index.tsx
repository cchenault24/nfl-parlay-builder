import { SECOND_TICK, useNow } from '@/lib/useNow'
import { useDerivedCurrentWeek } from '@shared/hooks/useDerivedCurrentWeek'
import { useEntitlements } from '@shared/hooks/useEntitlements'
import {
  cancelParlayRun,
  useParlayGenerator,
} from '@shared/hooks/useParlayGenerator'
import { useRateLimit } from '@shared/hooks/useRateLimit'
import {
  allowanceExhaustedCopy,
  bindingAllowance,
  timeUntil,
} from '@shared/rateLimits'
import { useGamesForWeek, useSeasonSummary } from '@shared/hooks/useSeason'
import useParlayStore, { parlayKey, type ParlayEntry } from '@shared/store/parlayStore'
import type { Game } from '@shared/types'
import { router, useNavigation } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ErrorBanner } from '@/components/ErrorBanner'
import UpgradeSheet from '@/components/UpgradeSheet'
import { BatchBar } from '@/components/build/BatchBar'
import { TAB_BAR_HIDDEN, TAB_BAR_STYLE } from '@/components/ui/tabBarStyle'
import { BuildRow } from '@/components/build/BuildRow'
import { CrossGameRow } from '@/components/build/CrossGameRow'
import { WeekHeader } from '@/components/build/WeekHeader'
import { WeekPickerSheet } from '@/components/build/WeekPickerSheet'
import { getParlayService } from '@/lib/api/parlayService'
import { batchGroups, runBatch, type BatchMode } from '@/lib/build/batch'
import { buildRowFor } from '@/lib/build/rowState'
import { useParlayPersistence } from '@/lib/build/useParlayPersistence'
import { colors, spacing, typography } from '@/lib/theme/designTokens'

// Room for the batch bar, which replaces the tab bar rather than stacking on it.
const BATCH_BAR_SPACE = 200

export default function BuildScreen() {
  const { currentWeek } = useDerivedCurrentWeek()
  const { data: seasonSummary } = useSeasonSummary()
  const availableWeeks = useMemo(
    () => seasonSummary?.weeks.map(w => w.week) ?? [],
    [seasonSummary]
  )

  // The browsed week lives in the store, not in this screen: the two pushed
  // screens have to resolve the same week, and a future week picked here would
  // otherwise leave them looking at the live one.
  const selectedWeek = useParlayStore(state => state.activeWeek)
  const setSelectedWeek = useParlayStore(state => state.setActiveWeek)
  const activeWeek = selectedWeek ?? currentWeek
  const { data: games, isLoading, error } = useGamesForWeek(activeWeek)

  // The *live* week, not the browsed one — see useParlayPersistence.
  useParlayPersistence(currentWeek)
  const entries = useParlayStore(state => state.entries)
  const { capabilities, quota, entitlements, refetch } = useEntitlements()
  const { rateLimit, getTimeUntilReset } = useRateLimit()

  const { generateAsync, error: runError } = useParlayGenerator(getParlayService())

  const [weekPickerOpen, setWeekPickerOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [mode, setMode] = useState<BatchMode>('separate')
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchNotice, setBatchNotice] = useState<string | null>(null)
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null)

  // The batch bar *replaces* the tab bar rather than stacking above it: two
  // bottom bars eat ~150pt and read as clutter, and select mode is modal by
  // nature — Done is the way out (DESIGN #11).
  const navigation = useNavigation()
  useEffect(() => {
    const tabs = navigation.getParent()
    tabs?.setOptions({ tabBarStyle: selectMode ? TAB_BAR_HIDDEN : TAB_BAR_STYLE })
    return () => tabs?.setOptions({ tabBarStyle: TAB_BAR_STYLE })
  }, [navigation, selectMode])

  const rows = useMemo(
    () =>
      (games ?? []).map(game =>
        buildRowFor(game, entries[parlayKey(activeWeek, [game.gameId])])
      ),
    [games, entries, activeWeek]
  )

  // Cross-game parlays are not any one game's row, so they sit above the list —
  // otherwise a finished one would be unreachable after a relaunch.
  const crossGameEntries = useMemo(
    () =>
      Object.values(entries).filter(
        entry => entry.week === activeWeek && entry.gameIds.length > 1
      ),
    [entries, activeWeek]
  )
  const builtCount = useMemo(
    () =>
      Object.values(entries).filter(
        entry => entry.week === activeWeek && entry.status === 'ready'
      ).length,
    [entries, activeWeek]
  )

  const openEntry = useCallback((entry: ParlayEntry) => {
    router.push(`/parlay/${[...entry.gameIds].sort().join('+')}`)
  }, [])

  const runOne = useCallback(
    async (gameIds: string[]) => {
      const chosen = (games ?? []).filter(g => gameIds.includes(g.gameId))
      if (chosen.length !== gameIds.length) {
        throw new Error('Those games are no longer in this week.')
      }
      await generateAsync(chosen)
    },
    [games, generateAsync]
  )

  const handleRowPress = useCallback(
    (game: Game, entry: ParlayEntry | undefined) => {
      if (entry?.status === 'ready') {
        return openEntry(entry)
      }
      if (entry?.status === 'failed') {
        // No auto-retry anywhere in this app: a failed run is retried because
        // someone asked for it.
        void runOne([game.gameId]).catch(() => undefined)
        return
      }
      router.push(`/game/${game.gameId}`)
    },
    [openEntry, runOne]
  )

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelected([])
    setBatchNotice(null)
  }

  const runBatchNow = async () => {
    setBatchRunning(true)
    setBatchNotice(null)
    const outcome = await runBatch(batchGroups(mode, selected), runOne)
    setBatchRunning(false)

    if (outcome.stoppedBy === 'rate_limited') {
      const left = outcome.skipped.length
      setBatchNotice(
        `Stopped after ${outcome.succeeded.length} — you have hit the run limit. ${left} game${left === 1 ? '' : 's'} not started. Try again in ${getTimeUntilReset() || 'a little while'}.`
      )
      return
    }
    if (mode === 'cross' && outcome.succeeded.length === 1) {
      const entry = useParlayStore.getState().entries[parlayKey(activeWeek, selected)]
      exitSelectMode()
      if (entry) {
        openEntry(entry)
      }
      return
    }
    exitSelectMode()
  }

  // What will refuse the next run first: free is held by its weekly quota, Pro
  // by the daily valve, and either by the hourly window after a burst.
  const allowance = bindingAllowance({ quota, rateLimit })
  // Names the window that actually ran out. Weekly exhaustion is the quota
  // strip's job, not a countdown's.
  const exhausted = allowanceExhaustedCopy(allowance)
  // Ticks only while there is a countdown on screen. Without it, timeUntil was
  // evaluated once per render and the banner showed a stopped clock — a user
  // watching "12m 30s" had no way to tell when the limit actually cleared.
  const countdownNow = useNow(SECOND_TICK, Boolean(exhausted))
  const maxGamesPerRun = capabilities?.maxGamesPerRun ?? 1

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.headerWrap}>
        <WeekHeader
          week={activeWeek}
          gameCount={games?.length ?? 0}
          builtCount={builtCount}
          selectMode={selectMode}
          canSelect={(games?.length ?? 0) > 0}
          quota={quota}
          onPickWeek={() => setWeekPickerOpen(true)}
          onToggleSelectMode={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
          onUpgrade={setUpgradeReason}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          selectMode && { paddingBottom: BATCH_BAR_SPACE },
        ]}
      >
        {isLoading && !games ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primaryBright} />
            <Text style={styles.loadingText}>Loading Week {activeWeek} games…</Text>
          </View>
        ) : error ? (
          <ErrorBanner
            type="error"
            title="Couldn't load games"
            message={`${error.message}. Try again or pick a different week.`}
          />
        ) : rows.length === 0 ? (
          <Text style={styles.empty}>No games found for Week {activeWeek}.</Text>
        ) : (
          <>
            {batchNotice ? (
              <ErrorBanner type="rate_limit_reached" title="Batch stopped" message={batchNotice} />
            ) : null}
            {runError && !selectMode ? (
              <ErrorBanner
                type="error"
                title="Parlay generation failed"
                message={runError.message}
              />
            ) : null}
            {exhausted ? (
              <ErrorBanner
                type="rate_limit_reached"
                title={exhausted.title}
                message={exhausted.message}
                countdown={timeUntil(allowance?.resetsAt, countdownNow)}
              />
            ) : null}

            {crossGameEntries.map(entry => (
              <CrossGameRow key={entry.key} entry={entry} onPress={() => openEntry(entry)} />
            ))}

            {rows.map(row => (
              <BuildRow
                key={row.game.gameId}
                row={row}
                selectMode={selectMode}
                selected={selected.includes(row.game.gameId)}
                onPress={() => handleRowPress(row.game, row.entry)}
                onToggleSelect={() =>
                  setSelected(current =>
                    current.includes(row.game.gameId)
                      ? current.filter(id => id !== row.game.gameId)
                      : [...current, row.game.gameId]
                  )
                }
                onCancel={() => cancelParlayRun(parlayKey(activeWeek, [row.game.gameId]))}
              />
            ))}
          </>
        )}
      </ScrollView>

      {selectMode ? (
        <BatchBar
          mode={mode}
          onModeChange={setMode}
          gameCount={selected.length}
          allowance={allowance}
          crossGameLocked={maxGamesPerRun < 2}
          maxGamesPerRun={maxGamesPerRun}
          running={batchRunning}
          onRun={() => void runBatchNow()}
          onLockedMode={() =>
            setUpgradeReason('One parlay across several games is part of Pro.')
          }
        />
      ) : null}

      <WeekPickerSheet
        visible={weekPickerOpen}
        week={activeWeek}
        availableWeeks={availableWeeks}
        onSelect={setSelectedWeek}
        onClose={() => setWeekPickerOpen(false)}
      />

      <UpgradeSheet
        visible={upgradeReason !== null}
        onClose={() => setUpgradeReason(null)}
        onPurchased={refetch}
        canPurchase={entitlements?.billingAvailable.apple ?? false}
        reason={upgradeReason ?? undefined}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  headerWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  body: { padding: spacing.md, paddingTop: spacing.sm, gap: spacing.sm },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  loadingText: { ...typography.body, color: colors.textSecondary },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    paddingVertical: spacing.sm,
  },
})
