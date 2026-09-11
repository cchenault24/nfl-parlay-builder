import { useState } from 'react'
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native'

import { RankChip } from '@/components/display/RankChip'
import {
  colors,
  MIN_TARGET,
  PRESSED_OPACITY,
  radius,
  spacing,
  typography,
} from '@/lib/theme/designTokens'

// A rank is a comparison and a value is a measurement; the row leads with the
// comparison because that is what decides anything, and keeps the measurement
// one tap away for when the rank alone is not enough ("30th" reads very
// differently at 210 yards than at 140).
export interface MatchupRowProps {
  label: string
  homeRank?: number | null
  awayRank?: number | null
  homeValue?: number | null
  awayValue?: number | null
  // Sits between the two values, under the label — "per game", "season". The
  // label already names the unit, so repeating "yards" on both sides said
  // nothing; what was missing is what the number is measured *over*, which is
  // the context the team stat cards used to carry.
  qualifier?: string
  index?: number
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function MatchupRow({
  label,
  homeRank,
  awayRank,
  homeValue,
  awayValue,
  qualifier,
  index = 0,
}: MatchupRowProps) {
  const [open, setOpen] = useState(false)
  // Overall is a mean of other ranks — there is no measurement behind it, so
  // that row simply is not a button.
  const expandable = homeValue != null || awayValue != null

  const body = (
    <>
      <View style={styles.top}>
        <View style={styles.side}>
          <RankChip rank={awayRank} />
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <View style={[styles.side, styles.right]}>
          <RankChip rank={homeRank} />
        </View>
      </View>

      {open ? (
        <View style={styles.values}>
          <View style={styles.side}>
            <Text style={styles.value}>
              {awayValue != null ? formatValue(awayValue) : '—'}
            </Text>
          </View>
          <Text style={styles.qualifier} numberOfLines={1}>
            {qualifier ?? ''}
          </Text>
          <View style={[styles.side, styles.right]}>
            <Text style={styles.value}>
              {homeValue != null ? formatValue(homeValue) : '—'}
            </Text>
          </View>
        </View>
      ) : null}
    </>
  )

  if (!expandable) {
    return <View style={[styles.row, index % 2 === 0 && styles.striped]}>{body}</View>
  }

  return (
    <Pressable
      onPress={() => {
        LayoutAnimation.configureNext(
          LayoutAnimation.create(
            140,
            LayoutAnimation.Types.easeOut,
            LayoutAnimation.Properties.opacity
          )
        )
        setOpen(v => !v)
      }}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityHint="Shows the per-game numbers behind these ranks"
      style={({ pressed }) => [
        styles.row,
        index % 2 === 0 && styles.striped,
        pressed && styles.pressed,
      ]}
    >
      {body}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    // These are adjacent touch targets, so the height has to carry the 44pt
    // minimum on its own — overlapping hitSlop would make neighbouring rows
    // ambiguous to hit.
    minHeight: MIN_TARGET,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  striped: { backgroundColor: colors.surfaceRaised },
  pressed: { opacity: PRESSED_OPACITY },
  top: { flexDirection: 'row', alignItems: 'center' },
  side: { width: 58 },
  right: { alignItems: 'flex-end' },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'center',
  },
  // Mirrors the rank row's three columns exactly, so each value lands under
  // its own team's chip and the qualifier under the label. The hairline ties
  // the two lines into one row rather than leaving a second line floating.
  values: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  // `textSecondary`, matching every other numeric detail line in the app
  // (BookLinesPanel, ParlayLegView). At full white the supporting number was
  // the loudest thing in the row, above the ranks it exists to explain.
  value: { ...typography.numericSmall, color: colors.textSecondary },
  qualifier: {
    ...typography.micro,
    color: colors.textDisabled,
    flex: 1,
    textAlign: 'center',
  },
})
