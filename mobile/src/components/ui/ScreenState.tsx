import Ionicons from '@expo/vector-icons/Ionicons'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import { colors, spacing, typography } from '@/lib/theme/designTokens'

/**
 * The two states every screen ends up in, said the same way everywhere.
 *
 * There were three loading treatments and three empty ones: a labelled inline
 * row on Build, a bare centred spinner on History and Game detail, left-aligned
 * prose on Build, a centred icon-and-title block on History, and centred muted
 * prose on Game and Parlay. Opening the app cold made it read as three products
 * — and there was no single place to change any of it.
 */
export function ScreenLoading({ label }: { label?: string }) {
  return (
    <View
      style={styles.centre}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Loading'}
    >
      <ActivityIndicator color={colors.primaryBright} />
      {label ? <Text style={styles.body}>{label}</Text> : null}
    </View>
  )
}

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon?: keyof typeof Ionicons.glyphMap
  title: string
  body?: string
}) {
  return (
    <View style={styles.centre}>
      {icon ? (
        <Ionicons name={icon} size={44} color={colors.textDisabled} />
      ) : null}
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  centre: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  title: { ...typography.title, color: colors.text, textAlign: 'center' },
  body: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
})
