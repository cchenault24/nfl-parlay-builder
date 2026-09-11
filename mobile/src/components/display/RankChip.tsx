import { StyleSheet } from 'react-native'

import { Chip } from '@/components/ui/Chip'
import { colors } from '@/lib/theme/designTokens'

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
  return colors.errorBright
}

export function RankChip({ rank }: { rank?: number | null }) {
  const label = rank && rank > 0 ? `${rank}${ordinal(rank)}` : 'N/A'
  return <Chip label={label} tint={tint(rank)} numeric style={styles.chip} />
}

const styles = StyleSheet.create({
  // Ranks sit in a column, so the chip holds its width rather than hugging
  // "1st" tighter than "22nd".
  chip: { minWidth: 54, alignItems: 'center' },
})
