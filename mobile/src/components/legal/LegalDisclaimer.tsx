import { StyleSheet, Text } from 'react-native'

import { MINIMUM_AGE } from '@/lib/legal/content'
import { colors, typography } from '@/lib/theme/designTokens'

// The web client's `inline` variant, shown alongside every generated parlay.
export function LegalDisclaimer() {
  return (
    <Text style={styles.text}>
      For entertainment purposes only. {MINIMUM_AGE}+ only.
    </Text>
  )
}

const styles = StyleSheet.create({
  text: { ...typography.bodySmall, color: colors.textSecondary },
})
