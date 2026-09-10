import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useDerivedCurrentWeek } from '@/lib/api/useDerivedCurrentWeek'
import { useGamesForWeek, useSeason } from '@/lib/api/useSeason'
import { useRateLimit } from '@/lib/api/useRateLimit'
import { colors, radius, spacing, typography } from '@/lib/theme/designTokens'

// Phase 3 proves the data layer end to end; the real week/game picker, risk
// toggle and run timeline are Phase 4.
export default function BuildScreen() {
  const season = useSeason()
  const { currentWeek, isLoading: weekLoading, error: weekError } = useDerivedCurrentWeek()
  const games = useGamesForWeek(currentWeek)
  const { rateLimitInfo, error: rateError } = useRateLimit()

  const error = weekError ?? games.error
  const loading = weekLoading || games.isLoading

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>Build a parlay</Text>
        <Text style={styles.subtitle}>
          Pick a game and risk level, and the agent drafts a 3-leg parlay.
        </Text>

        {loading ? <ActivityIndicator color={colors.primary} /> : null}

        {error ? (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.cardLabel}>API error</Text>
            <Text style={styles.errorText}>{error.message}</Text>
          </View>
        ) : null}

        {!loading && !error ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>data layer check</Text>
            <Text style={styles.value}>Season {season ?? '—'}</Text>
            <Text style={styles.value}>Week {currentWeek}</Text>
            <Text style={styles.value}>{games.data?.length ?? 0} games</Text>
            {games.data?.[0] ? (
              <Text style={styles.matchup}>
                e.g. {games.data[0].away.abbrev} @ {games.data[0].home.abbrev}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>rate limit</Text>
          {rateError ? (
            <Text style={styles.errorText}>{rateError}</Text>
          ) : (
            <Text style={styles.value}>
              {rateLimitInfo
                ? `${rateLimitInfo.remaining} of ${rateLimitInfo.total} left`
                : 'not loaded'}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.md, gap: spacing.sm },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary },
  card: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.xs,
  },
  errorCard: { borderColor: colors.error },
  cardLabel: { ...typography.label, color: colors.textSecondary },
  value: { ...typography.numeric, color: colors.secondary },
  matchup: { ...typography.bodySmall, color: colors.textSecondary },
  errorText: { ...typography.bodySmall, color: colors.error },
})
