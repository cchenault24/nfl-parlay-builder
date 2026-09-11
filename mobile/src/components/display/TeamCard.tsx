import type { RankedStat, TeamRef, TeamStats } from '@shared/types'
import { StyleSheet, Text, View } from 'react-native'

import { RankChip } from '@/components/display/RankChip'
import { TeamLogo } from '@/components/display/TeamLogo'
import { Card } from '@/components/ui/Card'
import { colors, spacing, typography } from '@/lib/theme/designTokens'

function StatRow({ label, stat }: { label: string; stat?: RankedStat }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValue}>
        <Text style={styles.statNumber}>
          {stat
            ? Number.isInteger(stat.value)
              ? String(stat.value)
              : stat.value.toFixed(1)
            : '—'}
        </Text>
        <RankChip rank={stat?.rank} />
      </View>
    </View>
  )
}

export function TeamCard({ team, stats }: { team: TeamRef; stats: TeamStats | null }) {
  return (
    <Card tone="inset" style={styles.card}>
      <View style={styles.header}>
        <TeamLogo teamName={team.name} size="small" />
        <Text style={styles.name} numberOfLines={1}>
          {team.name}
        </Text>
        <Text style={styles.record}>{team.record}</Text>
      </View>

      <Text style={styles.section}>Offense · per game</Text>
      <StatRow label="Passing yards" stat={stats?.offense.passingYardsPerGame} />
      <StatRow label="Rushing yards" stat={stats?.offense.rushingYardsPerGame} />
      <StatRow label="Points" stat={stats?.offense.pointsPerGame} />

      <Text style={[styles.section, styles.sectionGap]}>Defense · per game</Text>
      <StatRow label="Yards allowed" stat={stats?.defense.yardsAllowedPerGame} />
      <StatRow label="Points allowed" stat={stats?.defense.pointsAllowedPerGame} />
      <StatRow label="Takeaways (season)" stat={stats?.defense.takeaways} />
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  name: { ...typography.title, color: colors.text, flex: 1 },
  record: { ...typography.numeric, color: colors.textSecondary },
  section: { ...typography.label, color: colors.textSecondary, letterSpacing: 0.6 },
  sectionGap: { marginTop: spacing.md },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  statLabel: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  statValue: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statNumber: { ...typography.numeric, color: colors.text },
})
