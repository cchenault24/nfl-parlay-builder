import Ionicons from '@expo/vector-icons/Ionicons'
import type { GameSummary } from '@shared/types'
import { StyleSheet, Text, View } from 'react-native'

import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { colors, spacing, typography } from '@/lib/theme/designTokens'

function gameFlow(winProbability: number) {
  if (winProbability > 0.7) {
    return { label: 'Potential blowout', color: colors.secondary }
  }
  if (winProbability < 0.3) {
    return { label: 'Upset alert', color: colors.error }
  }
  return { label: 'Close game', color: colors.info }
}

interface GameSummaryViewProps {
  gameSummary: GameSummary
  gameContext: string
}

export function GameSummaryView({ gameSummary, gameContext }: GameSummaryViewProps) {
  const { winner, projectedScore, winProbability } = gameSummary.gamePrediction
  const flow = gameFlow(winProbability)
  const confidencePct = Math.round(winProbability * 100)

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="analytics-outline" size={20} color={colors.primaryBright} />
        <Text style={styles.title} accessibilityRole="header">
          AI game analysis
        </Text>
      </View>

      <View style={styles.chips}>
        <Chip label={flow.label} tint={flow.color} />
        <Chip
          label={`${confidencePct}% confidence`}
          tint={colors.primaryBright}
          numeric
        />
      </View>

      <Text style={styles.context}>{gameContext}</Text>

      <Text style={styles.section}>Matchup analysis</Text>
      <Text style={styles.body}>{gameSummary.matchupSummary}</Text>

      {gameSummary.keyFactors.length > 0 ? (
        <>
          <Text style={styles.section}>Key factors</Text>
          {gameSummary.keyFactors.map(factor => (
            <View key={factor} style={styles.factor}>
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color={colors.primaryBright}
                style={styles.factorIcon}
              />
              <Text style={styles.body}>{factor}</Text>
            </View>
          ))}
        </>
      ) : null}

      <Text style={styles.section}>Game prediction</Text>
      <View style={styles.prediction}>
        <Text style={styles.body}>
          {winner} wins {projectedScore.home}-{projectedScore.away} ({confidencePct}%
          confidence)
        </Text>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.title, color: colors.text },
  chips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  context: { ...typography.bodySmall, color: colors.textSecondary },
  section: { ...typography.label, color: colors.text, marginTop: spacing.sm },
  body: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  factor: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  factorIcon: { marginTop: 2 },
  prediction: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryBright,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
  },
})
