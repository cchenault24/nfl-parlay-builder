import type { Game, RankedStat, TeamStats } from '@shared/types'
import { StyleSheet, Text, View } from 'react-native'

import { MatchupRow } from '@/components/display/MatchupRow'
import { TeamLogo } from '@/components/display/TeamLogo'
import { colors, radius, spacing, typography } from '@/lib/theme/designTokens'

type StatPick = (s: TeamStats) => RankedStat

// Offense first, then defense, which is how the rest of the app talks about a
// team. Shown in full: this is the comparison the screen exists for, and it is
// seven rows — not enough to be worth hiding behind a disclosure.
const MATCHUP_ROWS: { label: string; pick: StatPick }[] = [
  { label: 'Total yards', pick: s => s.offense.totalYardsPerGame },
  { label: 'Passing yards', pick: s => s.offense.passingYardsPerGame },
  { label: 'Rushing yards', pick: s => s.offense.rushingYardsPerGame },
  { label: 'Points scored', pick: s => s.offense.pointsPerGame },
  { label: 'Yards allowed', pick: s => s.defense.yardsAllowedPerGame },
  { label: 'Points allowed', pick: s => s.defense.pointsAllowedPerGame },
  { label: 'Takeaways', pick: s => s.defense.takeaways },
]

interface MatchupRankingsProps {
  game: Game
  homeStats: TeamStats | null
  awayStats: TeamStats | null
}

export function MatchupRankings({ game, homeStats, awayStats }: MatchupRankingsProps) {
  const { home, away } = game
  const statsSeason = homeStats?.season ?? awayStats?.season
  const priorSeason = statsSeason !== undefined && statsSeason < game.season

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Matchup rankings
        </Text>
        {statsSeason !== undefined ? (
          <Text style={[styles.muted, styles.headerNote]}>
            {statsSeason} season{priorSeason ? ' (no games played yet this year)' : ''}
          </Text>
        ) : null}
      </View>

      <View style={styles.teamsRow}>
        <View style={styles.teamSide}>
          <TeamLogo teamName={away.name} size="small" />
          <Text style={styles.teamAbbrev}>{away.abbrev}</Text>
        </View>
        <Text style={styles.muted}>at</Text>
        <View style={[styles.teamSide, styles.teamSideRight]}>
          <Text style={styles.teamAbbrev}>{home.abbrev}</Text>
          <TeamLogo teamName={home.name} size="small" />
        </View>
      </View>

      <MatchupRow
        label="Overall"
        homeRank={homeStats?.overallRank}
        awayRank={awayStats?.overallRank}
        index={0}
      />
      {MATCHUP_ROWS.map((row, i) => (
        <MatchupRow
          key={row.label}
          label={row.label}
          homeRank={homeStats ? row.pick(homeStats).rank : undefined}
          awayRank={awayStats ? row.pick(awayStats).rank : undefined}
          index={i + 1}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: { ...typography.label, color: colors.text },
  muted: { ...typography.caption, color: colors.textSecondary },
  // Wraps rather than running off the edge. The note is long in the preseason
  // case, which is exactly when it matters most.
  headerNote: { flexShrink: 1, textAlign: 'right' },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  teamSide: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  teamSideRight: { justifyContent: 'flex-end' },
  teamAbbrev: { ...typography.label, color: colors.text },
})
