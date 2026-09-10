import { useDerivedCurrentWeek } from '@shared/hooks/useDerivedCurrentWeek'
import { useParlayGenerator } from '@shared/hooks/useParlayGenerator'
import { useSeasonSummary } from '@shared/hooks/useSeason'
import useParlayStore from '@shared/store/parlayStore'
import type { Game } from '@shared/types'
import { useCallback, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { GameSelector } from '@/components/GameSelector'
import { GameStatsPanel } from '@/components/display/GameStatsPanel'
import { ParlayDisplay } from '@/components/display/ParlayDisplay'
import { getParlayService } from '@/lib/api/parlayService'
import { colors, spacing } from '@/lib/theme/designTokens'

export default function BuildScreen() {
  const selectedGame = useParlayStore(state => state.selectedGame)
  const setSelectedGame = useParlayStore(state => state.setSelectedGame)
  const parlay = useParlayStore(state => state.parlay)

  const { currentWeek } = useDerivedCurrentWeek()
  const { data: seasonSummary } = useSeasonSummary()
  const availableWeeks = seasonSummary?.weeks.map(w => w.week) ?? []

  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const activeWeek = selectedWeek ?? currentWeek

  const { generate, isPending, error, reset, cancel } =
    useParlayGenerator(getParlayService())

  const handleGameChange = useCallback(
    (game: Game | null) => {
      setSelectedGame(game)
      reset()
    },
    [setSelectedGame, reset]
  )

  const handleWeekChange = (week: number) => {
    setSelectedWeek(week)
    handleGameChange(null)
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <GameSelector
          onGenerateParlay={() => selectedGame && generate({ game: selectedGame })}
          onGameChange={handleGameChange}
          canGenerate={!!selectedGame && !isPending}
          currentWeek={activeWeek}
          onWeekChange={handleWeekChange}
          availableWeeks={availableWeeks}
          parlayError={error}
        />

        {parlay && !isPending ? <GameStatsPanel /> : null}

        <ParlayDisplay loading={isPending} onCancel={cancel} />

        <View style={styles.tail} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.md, gap: spacing.md },
  tail: { height: spacing.xl },
})
