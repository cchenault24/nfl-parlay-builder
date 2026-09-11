import Ionicons from '@expo/vector-icons/Ionicons'
import type { Game, RankedStat, TeamStats } from '@shared/types'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { MatchupRow } from '@/components/display/MatchupRow'
import { TeamCard } from '@/components/display/TeamCard'
import { TeamLogo } from '@/components/display/TeamLogo'
import {
  colors,
  MIN_TARGET,
  PRESSED_OPACITY,
  radius,
  spacing,
  typography,
} from '@/lib/theme/designTokens'

type StatPick = (s: TeamStats) => RankedStat

// Overall first, then the rest. The first three carry most of the read, so the
// rest sit behind a disclosure rather than pushing the pinned action off screen.
const HEADLINE_ROWS: { label: string; pick: StatPick }[] = [
  { label: 'Total yards', pick: s => s.offense.totalYardsPerGame },
  { label: 'Points scored', pick: s => s.offense.pointsPerGame },
  { label: 'Points allowed', pick: s => s.defense.pointsAllowedPerGame },
]

const DETAIL_ROWS: { label: string; pick: StatPick }[] = [
  { label: 'Passing yards', pick: s => s.offense.passingYardsPerGame },
  { label: 'Rushing yards', pick: s => s.offense.rushingYardsPerGame },
  { label: 'Yards allowed', pick: s => s.defense.yardsAllowedPerGame },
  { label: 'Takeaways', pick: s => s.defense.takeaways },
]

interface MatchupRankingsProps {
  game: Game
  homeStats: TeamStats | null
  awayStats: TeamStats | null
}

export function MatchupRankings({ game, homeStats, awayStats }: MatchupRankingsProps) {
  const [open, setOpen] = useState(false)
  const { home, away } = game
  const statsSeason = homeStats?.season ?? awayStats?.season
  const priorSeason = statsSeason !== undefined && statsSeason < game.season
  const rows = open ? [...HEADLINE_ROWS, ...DETAIL_ROWS] : HEADLINE_ROWS

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
      {rows.map((row, i) => (
        <MatchupRow
          key={row.label}
          label={row.label}
          homeRank={homeStats ? row.pick(homeStats).rank : undefined}
          awayRank={awayStats ? row.pick(awayStats).rank : undefined}
          index={i + 1}
        />
      ))}

      <Pressable
        onPress={() => setOpen(v => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.disclosure, pressed && styles.pressed]}
      >
        <Text style={styles.disclosureText}>
          {open ? 'Fewer rankings' : 'All rankings'}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.primaryBright}
        />
      </Pressable>

      {open ? (
        <View style={styles.cards}>
          <TeamCard team={away} stats={awayStats} />
          <TeamCard team={home} stats={homeStats} />
        </View>
      ) : null}
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
  disclosure: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: MIN_TARGET,
  },
  disclosureText: { ...typography.label, color: colors.primaryBright },
  pressed: { opacity: PRESSED_OPACITY },
  cards: { gap: spacing.sm },
})
