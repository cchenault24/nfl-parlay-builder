import { getBetTypeColor, getConfidenceColor } from '@shared/betColors'
import { formatOdds, impliedProbability } from '@shared/odds'
import type { ParlayLeg } from '@shared/types'
import { StyleSheet, Text, View } from 'react-native'

import { TeamLogo } from '@/components/display/TeamLogo'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import {
  colors,
  radius,
  semanticColor,
  spacing,
  typography,
} from '@/lib/theme/designTokens'

export function ParlayLegView({ leg, index }: { leg: ParlayLeg; index: number }) {
  const implied = impliedProbability(leg.odds)
  // Only a real market price implies a fair edge comparison; an unanchored
  // leg's price is the model's own invention, so there's no book to beat.
  const belowImplied = leg.anchored && leg.confidence <= implied
  const betTint = semanticColor[getBetTypeColor(leg.betType)]
  const confTint = semanticColor[getConfidenceColor(leg.confidence)]
  const confidencePct = Math.round(leg.confidence * 100)

  return (
    <Card tone="inset" style={styles.card}>
      <View style={styles.header}>
        <TeamLogo teamName={leg.team} size="small" />
        <Text style={styles.legNo}>Leg {index + 1}</Text>
        <Chip label={formatOdds(leg.odds)} tint={colors.primaryBright} numeric />
        {!leg.anchored ? <Chip label="Estimate" tint={colors.warning} /> : null}
        <Chip
          label={leg.betType.replace(/_/g, ' ')}
          tint={betTint}
          style={styles.betChip}
        />
      </View>

      <Text style={styles.selection}>{leg.selection}</Text>
      <Text style={styles.reasoning}>{leg.reasoning}</Text>

      <View
        style={styles.confidenceRow}
        accessibilityRole="progressbar"
        accessibilityLabel="Model confidence"
        accessibilityValue={{ min: 0, max: 100, now: confidencePct }}
      >
        <Text style={styles.confidenceLabel}>Confidence</Text>
        <View style={styles.track}>
          <View
            style={[styles.fill, { width: `${confidencePct}%`, backgroundColor: confTint }]}
          />
        </View>
        <Text style={styles.confidenceValue}>{confidencePct}%</Text>
      </View>
      <Text style={styles.implied}>
        Book implies {Math.round(implied * 100)}%
      </Text>

      {belowImplied ? (
        <Text style={styles.warn}>
          Model confidence is at or below the book&apos;s implied probability.
        </Text>
      ) : null}
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  legNo: { ...typography.label, color: colors.textSecondary },
  // Pushed to the trailing edge so the bet type reads as the row's category
  // rather than another value in the sequence.
  betChip: { marginLeft: 'auto', maxWidth: 150 },
  selection: { ...typography.title, color: colors.text },
  reasoning: { ...typography.bodySmall, color: colors.textSecondary },

  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  confidenceLabel: { ...typography.caption, color: colors.textSecondary },
  track: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill },
  confidenceValue: {
    ...typography.numericSmall,
    color: colors.text,
    minWidth: 40,
    textAlign: 'right',
  },
  // Its own line now. Sharing the bar's row meant two numbers competing for
  // the same trailing edge, and the wider one clipped at large text sizes.
  implied: { ...typography.caption, color: colors.textSecondary },
  warn: { ...typography.bodySmall, color: colors.warning },
})
