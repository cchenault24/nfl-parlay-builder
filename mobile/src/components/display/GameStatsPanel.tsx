import Ionicons from '@expo/vector-icons/Ionicons'
import { formatOdds } from '@shared/odds'
import useParlayStore from '@shared/store/parlayStore'
import type { RankedStat, TeamStats } from '@shared/types'
import { useState } from 'react'
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native'

import { MatchupRow } from '@/components/display/MatchupRow'
import { TeamCard } from '@/components/display/TeamCard'
import { TeamLogo } from '@/components/display/TeamLogo'
import { colors, radius, spacing, typography } from '@/lib/theme/designTokens'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

type StatPick = (s: TeamStats) => RankedStat

const MATCHUP_ROWS: Array<{ label: string; pick: StatPick }> = [
  { label: 'Total yards', pick: s => s.offense.totalYardsPerGame },
  { label: 'Passing yards', pick: s => s.offense.passingYardsPerGame },
  { label: 'Rushing yards', pick: s => s.offense.rushingYardsPerGame },
  { label: 'Points scored', pick: s => s.offense.pointsPerGame },
  { label: 'Yards allowed', pick: s => s.defense.yardsAllowedPerGame },
  { label: 'Points allowed', pick: s => s.defense.pointsAllowedPerGame },
  { label: 'Takeaways', pick: s => s.defense.takeaways },
]

function InfoRow({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap
  text: string
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.textSecondary} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  )
}

export function GameStatsPanel() {
  const game = useParlayStore(state => state.game)
  const homeStats = useParlayStore(state => state.homeStats)
  const awayStats = useParlayStore(state => state.awayStats)
  const odds = useParlayStore(state => state.odds)
  const parlay = useParlayStore(state => state.parlay)
  const [open, setOpen] = useState(false)

  if (!game) {
    return null
  }

  const { home, away, venue, weather, dateTime } = game
  const statsSeason = homeStats?.season ?? awayStats?.season
  const priorSeason = statsSeason !== undefined && statsSeason < game.season

  const toggle = () => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(180, LayoutAnimation.Types.easeOut, LayoutAnimation.Properties.opacity)
    )
    setOpen(v => !v)
  }

  return (
    <View style={styles.card}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
      >
        <Text style={styles.title}>Game data</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </Pressable>

      {open ? (
        <View style={styles.details}>
          {parlay?.gameContext ? (
            <Text style={styles.context}>{parlay.gameContext}</Text>
          ) : null}

          <View style={styles.infoBlock}>
            <InfoRow
              icon="time-outline"
              text={`${new Date(dateTime).toLocaleString('en-US', {
                timeZone: 'America/New_York',
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })} ET`}
            />
            {venue ? (
              <InfoRow
                icon="location-outline"
                text={`${venue.name}, ${venue.city}, ${venue.state}${venue.indoor ? ' (indoor)' : ''}${game.neutralSite ? ' · neutral site' : ''}`}
              />
            ) : null}
            <InfoRow
              icon="thermometer-outline"
              text={
                venue?.indoor
                  ? 'Indoor stadium — weather not a factor'
                  : weather
                    ? `Forecast at kickoff: ${weather.condition}, ${weather.temperatureF}°F`
                    : 'Forecast not available'
              }
            />
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>
              {odds ? `Book lines · ${odds.bookmaker}` : 'Book lines'}
            </Text>
            {odds ? (
              <View style={styles.lines}>
                <Text style={styles.line}>
                  Spread:{' '}
                  {odds.spread
                    ? `${home.abbrev} ${formatOdds(odds.spread.line)} (${formatOdds(odds.spread.homePrice)})`
                    : '—'}
                </Text>
                <Text style={styles.line}>
                  Total:{' '}
                  {odds.total
                    ? `${odds.total.line} (O ${formatOdds(odds.total.overPrice)} / U ${formatOdds(odds.total.underPrice)})`
                    : '—'}
                </Text>
                <Text style={styles.line}>
                  Moneyline:{' '}
                  {odds.moneyline
                    ? `${home.abbrev} ${formatOdds(odds.moneyline.home)} / ${away.abbrev} ${formatOdds(odds.moneyline.away)}`
                    : '—'}
                </Text>
              </View>
            ) : (
              <Text style={styles.muted}>Not available for this game.</Text>
            )}
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Matchup rankings</Text>
              {statsSeason !== undefined ? (
                <Text style={styles.muted}>
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

          <TeamCard team={away} stats={awayStats} />
          <TeamCard team={home} stats={homeStats} />
        </View>
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
    overflow: 'hidden',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  title: { ...typography.title, color: colors.text },
  pressed: { opacity: 0.7 },
  details: { padding: spacing.md, paddingTop: 0, gap: spacing.md },
  context: { ...typography.bodySmall, color: colors.textSecondary },

  infoBlock: { gap: spacing.xs },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },

  panel: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  panelTitle: { ...typography.label, color: colors.text },
  lines: { gap: spacing.xs },
  line: { ...typography.numeric, fontSize: 13, color: colors.textSecondary },
  muted: { ...typography.bodySmall, fontSize: 12, color: colors.textSecondary },

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
