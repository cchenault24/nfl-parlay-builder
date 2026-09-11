import { StyleSheet, Text, View } from 'react-native'

import { RankChip } from '@/components/display/RankChip'
import { colors, radius, spacing, typography } from '@/lib/theme/designTokens'

export interface MatchupRowProps {
  label: string
  homeRank?: number | null
  awayRank?: number | null
  index?: number
}

export function MatchupRow({ label, homeRank, awayRank, index = 0 }: MatchupRowProps) {
  return (
    <View style={[styles.row, index % 2 === 0 && styles.striped]}>
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
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  striped: { backgroundColor: colors.surfaceRaised },
  side: { width: 58 },
  right: { alignItems: 'flex-end' },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'center',
  },
})
