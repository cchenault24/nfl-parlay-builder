import { getBetTypeColor, getConfidenceColor } from '@shared/betColors'
import { formatOdds, impliedProbability } from '@shared/odds'
import type { ParlayLeg } from '@shared/types'
import { StyleSheet, Text, View } from 'react-native'

import { TeamLogo } from '@/components/display/TeamLogo'
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

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TeamLogo teamName={leg.team} size="small" />
        <Text style={styles.legNo}>Leg {index + 1}</Text>
        <View style={[styles.chip, { borderColor: colors.primary }]}>
          <Text style={[styles.chipText, { color: colors.primary }]}>
            {formatOdds(leg.odds)}
          </Text>
        </View>
        {!leg.anchored ? (
          <View style={[styles.chip, { borderColor: colors.warning }]}>
            <Text style={[styles.chipText, { color: colors.warning }]}>Estimate</Text>
          </View>
        ) : null}
        <View style={[styles.chip, styles.betChip, { borderColor: betTint }]}>
          <Text style={[styles.chipText, { color: betTint }]} numberOfLines={1}>
            {leg.betType.replace(/_/g, ' ')}
          </Text>
        </View>
      </View>

      <Text style={styles.selection}>{leg.selection}</Text>
      <Text style={styles.reasoning}>{leg.reasoning}</Text>

      <View style={styles.confidenceRow}>
        <Text style={styles.confidenceLabel}>Confidence</Text>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${Math.round(leg.confidence * 100)}%`, backgroundColor: confTint },
            ]}
          />
        </View>
        <Text style={styles.confidenceValue}>{Math.round(leg.confidence * 100)}%</Text>
        <Text style={styles.implied}>Implied {Math.round(implied * 100)}%</Text>
      </View>

      {belowImplied ? (
        <Text style={styles.warn}>
          Model confidence is at or below the book&apos;s implied probability.
        </Text>
      ) : null}
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
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  legNo: { ...typography.label, color: colors.textSecondary },
  chip: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  betChip: { marginLeft: 'auto', maxWidth: 140 },
  chipText: { ...typography.numeric, fontSize: 12 },
  selection: { ...typography.title, color: colors.text },
  reasoning: { ...typography.bodySmall, color: colors.textSecondary },

  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  confidenceLabel: { ...typography.bodySmall, color: colors.textSecondary },
  track: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill },
  confidenceValue: { ...typography.numeric, fontSize: 13, color: colors.text, minWidth: 36, textAlign: 'right' },
  implied: { ...typography.numeric, fontSize: 12, color: colors.textSecondary, minWidth: 86, textAlign: 'right' },
  warn: { ...typography.bodySmall, color: colors.warning },
})
