import Ionicons from '@expo/vector-icons/Ionicons'
import { useRateLimit } from '@shared/hooks/useRateLimit'
import { useGamesForWeek } from '@shared/hooks/useSeason'
import useParlayStore from '@shared/store/parlayStore'
import type { Game, RiskLevel } from '@shared/types'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { ErrorBanner } from '@/components/ErrorBanner'
import { TeamLogo } from '@/components/display/TeamLogo'
import { WeekSelector } from '@/components/WeekSelector'
import { colors, radius, spacing, typography } from '@/lib/theme/designTokens'

const RISK_LEVELS: Array<{ value: RiskLevel; label: string }> = [
  { value: 'conservative', label: 'Conservative' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'aggressive', label: 'Aggressive' },
]

const formatKickoff = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

interface GameSelectorProps {
  onGenerateParlay: () => void
  onGameChange: (game: Game | null) => void
  canGenerate: boolean
  currentWeek: number
  onWeekChange: (week: number) => void
  availableWeeks: number[]
  parlayError?: Error | null
}

export function GameSelector({
  onGenerateParlay,
  onGameChange,
  canGenerate,
  currentWeek,
  onWeekChange,
  availableWeeks,
  parlayError,
}: GameSelectorProps) {
  const { data: games, isLoading, error } = useGamesForWeek(currentWeek)
  const { rateLimitInfo, isAtLimit, getTimeUntilReset } = useRateLimit()
  const selectedGame = useParlayStore(state => state.selectedGame)
  const riskLevel = useParlayStore(state => state.riskLevel)
  const setRiskLevel = useParlayStore(state => state.setRiskLevel)
  const [, tick] = useState(0)

  const atLimit = isAtLimit()
  useEffect(() => {
    if (!atLimit) {
      return
    }
    const id = setInterval(() => tick(v => v + 1), 1000)
    return () => clearInterval(id)
  }, [atLimit])

  useEffect(() => {
    // Only clear the selection if it vanished from the week we're actually
    // showing. If `currentWeek` itself ticked over in the background (the
    // derived "current week" advancing as games go final), `games` is now a
    // different week's list and won't contain the old selection either —
    // that's not a reason to drop what the user is looking at.
    if (
      selectedGame &&
      games &&
      selectedGame.week === currentWeek &&
      !games.some(g => g.gameId === selectedGame.gameId)
    ) {
      onGameChange(null)
    }
  }, [selectedGame, games, currentWeek, onGameChange])

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Select a game</Text>

      <WeekSelector
        currentWeek={currentWeek}
        onWeekChange={onWeekChange}
        availableWeeks={availableWeeks}
      />

      {isLoading && !games ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading Week {currentWeek} games…</Text>
        </View>
      ) : error ? (
        <ErrorBanner
          type="error"
          title="Couldn't load games"
          message={`${error.message}. Try again or pick a different week.`}
        />
      ) : !games || games.length === 0 ? (
        <Text style={styles.emptyText}>No games found for Week {currentWeek}.</Text>
      ) : (
        <>
          <Text style={styles.count}>
            {games.length} game{games.length === 1 ? '' : 's'}
          </Text>

          <View style={styles.list}>
            {games.map(game => {
              const closed = game.status !== 'scheduled'
              const selected = selectedGame?.gameId === game.gameId
              return (
                <Pressable
                  key={game.gameId}
                  disabled={closed}
                  onPress={() => onGameChange(game)}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: closed }}
                  style={({ pressed }) => [
                    styles.game,
                    selected && styles.gameSelected,
                    closed && styles.gameClosed,
                    pressed && !closed && styles.pressed,
                  ]}
                >
                  <View style={styles.matchup}>
                    <TeamLogo teamName={game.away.name} size="small" />
                    <Text style={styles.abbrev}>{game.away.abbrev}</Text>
                    <Text style={styles.at}>at</Text>
                    <Text style={styles.abbrev}>{game.home.abbrev}</Text>
                    <TeamLogo teamName={game.home.name} size="small" />
                    {selected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={colors.primary}
                        style={styles.check}
                      />
                    ) : null}
                  </View>
                  <Text style={styles.kickoff}>
                    {formatKickoff(game.dateTime)}
                    {closed ? ` · ${game.status.replace('_', ' ')}` : ''}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          <View style={styles.riskBlock}>
            <Text style={styles.label}>Risk</Text>
            <View style={styles.segmented}>
              {RISK_LEVELS.map(r => {
                const active = riskLevel === r.value
                return (
                  <Pressable
                    key={r.value}
                    onPress={() => setRiskLevel(r.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.segment,
                      active && styles.segmentActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                      {r.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          {atLimit ? (
            <ErrorBanner
              type="rate_limit_reached"
              title="Hourly limit reached"
              message={`You've used all ${rateLimitInfo?.total ?? 0} parlay generations for this hour.`}
              countdown={getTimeUntilReset()}
            />
          ) : null}
          {parlayError ? (
            <ErrorBanner
              type="error"
              title="Parlay generation failed"
              message={parlayError.message}
            />
          ) : null}

          <Pressable
            onPress={onGenerateParlay}
            disabled={!canGenerate || atLimit}
            style={({ pressed }) => [
              styles.generate,
              (!canGenerate || atLimit) && styles.generateDisabled,
              pressed && canGenerate && !atLimit && styles.pressed,
            ]}
          >
            <Ionicons
              name={atLimit ? 'time-outline' : 'dice-outline'}
              size={20}
              color={colors.text}
            />
            <Text style={styles.generateText}>Create 3-leg parlay</Text>
          </Pressable>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.md,
  },
  heading: { ...typography.title, color: colors.text },
  label: { ...typography.label, color: colors.text },
  count: { ...typography.bodySmall, color: colors.textSecondary },

  loading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  loadingText: { ...typography.body, color: colors.textSecondary },
  emptyText: { ...typography.body, color: colors.textSecondary, paddingVertical: spacing.sm },

  list: { gap: spacing.sm },
  game: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.xs,
  },
  gameSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceRaised },
  gameClosed: { opacity: 0.45 },
  matchup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  abbrev: { ...typography.title, fontSize: 16, color: colors.text },
  at: { ...typography.bodySmall, color: colors.textSecondary },
  check: { marginLeft: 'auto' },
  kickoff: { ...typography.bodySmall, fontSize: 12, color: colors.textSecondary },

  riskBlock: { gap: spacing.sm },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  segment: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { ...typography.label, fontSize: 12, color: colors.textSecondary },
  segmentTextActive: { color: colors.text },

  generate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  generateDisabled: { backgroundColor: colors.surfaceRaised },
  generateText: { ...typography.button, color: colors.text },
  pressed: { opacity: 0.75 },
})
