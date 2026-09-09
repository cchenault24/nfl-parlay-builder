import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { formatOdds, impliedProbability } from '@shared/odds'
import { colors, spacing, typography } from '@/lib/theme/designTokens'

// Phase 1 placeholder. The real week/game picker, risk toggle and run
// timeline land in Phase 4; this screen exists to prove the toolchain —
// Metro resolving `@shared` from outside the package, Inter, and the tabs.
export default function BuildScreen() {
  const sampleOdds = -150
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.body}>
        <Text style={styles.title}>Build a parlay</Text>
        <Text style={styles.subtitle}>
          Pick a game and risk level, and the agent drafts a 3-leg parlay.
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>shared/ wiring check</Text>
          <Text style={styles.numeric}>
            {formatOdds(sampleOdds)} implies{' '}
            {(impliedProbability(sampleOdds) * 100).toFixed(1)}%
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, padding: spacing.md, gap: spacing.sm },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary },
  card: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.xs,
  },
  cardLabel: { ...typography.label, color: colors.textSecondary },
  numeric: { ...typography.numeric, color: colors.secondary },
})
