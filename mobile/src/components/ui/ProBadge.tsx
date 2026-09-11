import Ionicons from '@expo/vector-icons/Ionicons'
import { StyleSheet, Text, View } from 'react-native'

import { colors, radius, spacing, typography } from '@/lib/theme/designTokens'

// Marks a control the current plan cannot reach. It sits *beside* what it
// labels rather than floating over it: the whole point of leaving a locked
// control on screen is that the user can still read it.
export function ProBadge() {
  return (
    <View style={styles.badge}>
      <Ionicons name="lock-closed" size={9} color={colors.background} />
      <Text style={styles.text}>PRO</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.secondary,
  },
  text: {
    ...typography.micro,
    fontSize: 10,
    letterSpacing: 0.4,
    color: colors.background,
  },
})
