import { getTeamLogoUrl } from '@shared/teamLogos'
import { Image } from 'expo-image'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { colors, fonts, radius } from '@/lib/theme/designTokens'

const SIZES = { small: 24, medium: 40, large: 64 } as const

export interface TeamLogoProps {
  teamName: string
  size?: keyof typeof SIZES
}

export function TeamLogo({ teamName, size = 'medium' }: TeamLogoProps) {
  const [failed, setFailed] = useState(false)
  const px = SIZES[size]
  const url = teamName.trim().length >= 2 ? getTeamLogoUrl(teamName) : ''

  if (!url || failed) {
    const abbreviation = teamName.length >= 2 ? teamName.slice(0, 3).toUpperCase() : 'UNK'
    return (
      <View
        style={[styles.fallback, { width: px, height: px }]}
        accessibilityLabel={teamName.trim() || abbreviation}
      >
        <Text style={[styles.fallbackText, { fontSize: px * 0.3 }]} numberOfLines={1}>
          {abbreviation}
        </Text>
      </View>
    )
  }

  return (
    <Image
      source={{ uri: url }}
      style={{ width: px, height: px, borderRadius: radius.sm }}
      contentFit="contain"
      onError={() => setFailed(true)}
      accessibilityLabel={`${teamName} logo`}
      transition={120}
    />
  )
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  fallbackText: { fontFamily: fonts.bold, color: colors.textSecondary },
})
