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
  // Appended to each value — "yards", "points". Omitted for plain counts.
  unit?: string
  index?: number
}

function formatValue(value: number, unit?: string): string {
  const number = Number.isInteger(value) ? String(value) : value.toFixed(1)
  return unit ? `${number} ${unit}` : number
}

export function MatchupRow({
  label,
  homeRank,
  awayRank,
  homeValue,
  awayValue,
  unit,
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
          <Text style={[styles.value, styles.valueLeft]}>
            {awayValue != null ? formatValue(awayValue, unit) : '—'}
          </Text>
          <Text style={[styles.value, styles.valueRight]}>
            {homeValue != null ? formatValue(homeValue, unit) : '—'}
          </Text>
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
  // Each value sits under its own team's chip, so which is which needs no
  // explaining.
  values: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  value: { ...typography.numericSmall, color: colors.text },
  valueLeft: { textAlign: 'left' },
  valueRight: { textAlign: 'right' },
})
