import { StyleSheet, Text, View } from 'react-native'

import { colors, radius, typography } from '@/lib/theme/designTokens'

function ordinal(n: number): string {
  const j = n % 10
  const k = n % 100
  if (j === 1 && k !== 11) {
    return 'st'
  }
  if (j === 2 && k !== 12) {
    return 'nd'
  }
  if (j === 3 && k !== 13) {
    return 'rd'
  }
  return 'th'
}

// Lower rank is better: top ten green, mid amber, bottom red.
function tint(rank?: number | null) {
  if (!rank || rank <= 0) {
    return colors.textDisabled
  }
  if (rank <= 10) {
    return colors.success
  }
  if (rank <= 22) {
    return colors.warning
  }
  return colors.error
}

export function RankChip({ rank }: { rank?: number | null }) {
  const color = tint(rank)
  const label = rank && rank > 0 ? `${rank}${ordinal(rank)}` : 'N/A'
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  chip: {
    minWidth: 52,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  label: { ...typography.numeric, fontSize: 12 },
})
