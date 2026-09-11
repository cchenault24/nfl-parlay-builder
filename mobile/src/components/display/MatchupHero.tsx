import Ionicons from '@expo/vector-icons/Ionicons'
import { formatKickoff } from '@shared/kickoff'
import type { Game } from '@shared/types'
import { StyleSheet, Text, View } from 'react-native'

import { TeamLogo } from '@/components/display/TeamLogo'
import { colors, spacing, typography } from '@/lib/theme/designTokens'

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

// Who is playing, and the three context facts that change how a game reads:
// when it kicks off, where, and what the weather will do to it.
export function MatchupHero({ game }: { game: Game }) {
  const { home, away, venue, weather, dateTime, neutralSite } = game

  return (
    <View style={styles.hero}>
      <View style={styles.teams}>
        <View style={styles.team}>
          <TeamLogo teamName={away.name} size="large" />
          <Text style={styles.name} numberOfLines={1}>
            {away.abbrev}
          </Text>
          <Text style={styles.record}>{away.record}</Text>
        </View>
        <Text style={styles.at}>at</Text>
        <View style={styles.team}>
          <TeamLogo teamName={home.name} size="large" />
          <Text style={styles.name} numberOfLines={1}>
            {home.abbrev}
          </Text>
          <Text style={styles.record}>{home.record}</Text>
        </View>
      </View>

      <View style={styles.info}>
        <InfoRow
          icon="time-outline"
          text={formatKickoff(dateTime)}
        />
        {venue ? (
          <InfoRow
            icon="location-outline"
            text={`${venue.name}, ${venue.city}, ${venue.state}${venue.indoor ? ' (indoor)' : ''}${neutralSite ? ' · neutral site' : ''}`}
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
    </View>
  )
}

const styles = StyleSheet.create({
  hero: { gap: spacing.md },
  teams: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  team: { flex: 1, alignItems: 'center', gap: spacing.xs },
  name: { ...typography.heading, color: colors.text },
  record: { ...typography.numericSmall, color: colors.textSecondary },
  at: { ...typography.caption, color: colors.textDisabled },
  info: { gap: spacing.xs },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
})
