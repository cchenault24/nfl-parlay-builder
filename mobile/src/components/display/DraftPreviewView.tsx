import { formatOdds } from '@shared/odds'
import type { DraftPreview } from '@shared/types'
import { StyleSheet, Text, View } from 'react-native'

import { Card } from '@/components/ui/Card'
import { colors, radius, spacing, typography } from '@/lib/theme/designTokens'

/**
 * The draft as the model writes it.
 *
 * Every string here can be half a sentence and every field can be missing —
 * this is a prefix of a document still being generated, so it renders whatever
 * has arrived and nothing more. It replaces ~25 seconds of watching a spinner
 * with ~25 seconds of watching the reasoning that produced the parlay, which is
 * the part people actually want to read (DESIGN #4).
 */
export function DraftPreviewView({ preview }: { preview: DraftPreview }) {
  const games = preview.analysisSummary?.games ?? []
  const legs = preview.legs ?? []
  const slate = preview.analysisSummary?.slateSummary

  if (games.length === 0 && legs.length === 0) {
    return null
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">
        Reading the matchup
      </Text>

      {games.map((game, i) => (
        <View key={i} style={styles.block}>
          {game.matchupSummary ? (
            <Text style={styles.prose}>{game.matchupSummary}</Text>
          ) : null}
          {(game.keyFactors ?? []).map((factor, j) => (
            <View key={j} style={styles.factor}>
              <View style={styles.bullet} />
              <Text style={styles.factorText}>{factor}</Text>
            </View>
          ))}
          {game.gamePrediction?.winner ? (
            <Text style={styles.prediction}>
              {game.gamePrediction.winner}
              {game.gamePrediction.projectedScore?.home !== undefined &&
              game.gamePrediction.projectedScore.away !== undefined
                ? ` ${game.gamePrediction.projectedScore.home}-${game.gamePrediction.projectedScore.away}`
                : ''}
            </Text>
          ) : null}
        </View>
      ))}

      {slate ? <Text style={styles.prose}>{slate}</Text> : null}

      {legs.length > 0 ? (
        <View style={styles.legs}>
          {legs.map((leg, i) => (
            <View key={i} style={styles.leg}>
              <View style={styles.legHeader}>
                <Text style={styles.legSelection} numberOfLines={2}>
                  {leg.selection ?? leg.team ?? 'Leg'}
                </Text>
                {/* A price the model has written but not yet had replaced by
                    the book's own number. Muted, because until the run
                    finishes it is a proposal rather than a price. */}
                {leg.odds !== undefined ? (
                  <Text style={styles.legOdds}>{formatOdds(leg.odds)}</Text>
                ) : null}
              </View>
              {leg.reasoning ? (
                <Text style={styles.legReasoning}>{leg.reasoning}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.md, gap: spacing.sm },
  title: { ...typography.title, color: colors.text },

  block: { gap: spacing.xs },
  prose: { ...typography.bodySmall, color: colors.textSecondary },

  factor: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryBright,
    // Centres the dot on the first line of text rather than the block.
    marginTop: 7,
  },
  factorText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  prediction: { ...typography.label, color: colors.text, marginTop: spacing.xxs },

  legs: { gap: spacing.sm, marginTop: spacing.xs },
  leg: {
    gap: spacing.xxs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  legHeader: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  legSelection: { ...typography.label, color: colors.text, flex: 1 },
  legOdds: { ...typography.numericSmall, color: colors.textSecondary },
  legReasoning: { ...typography.caption, color: colors.textDisabled },
})
