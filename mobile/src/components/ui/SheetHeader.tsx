import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import {
  colors,
  HIT_SLOP,
  MIN_TARGET,
  spacing,
  typography,
} from '@/lib/theme/designTokens'

/**
 * The title-and-close row at the top of a full-screen `pageSheet` modal.
 *
 * Written out three times — AuthSheet, LegalDocumentSheet and
 * ResponsibleGambling — each with the same hairline-bottomed row, the same
 * 24pt close glyph and the same hit slop, and each with its own copy of the
 * accessibility label. The three had already drifted on alignment, which is the
 * cheap tell that they were being maintained separately.
 *
 * `ui/Sheet` is the bottom-sheet primitive and is deliberately not this: a
 * pageSheet is presented by the OS and has no scrim to dismiss, so it needs a
 * header rather than a grabber and a Done control.
 */
export function SheetHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string
  subtitle?: string
  onClose: () => void
}) {
  return (
    <View style={styles.header}>
      <View style={styles.text}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Pressable
        onPress={onClose}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel={`Close ${title}`}
        style={styles.close}
      >
        <Ionicons name="close" size={24} color={colors.textSecondary} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    // flex-start rather than center: a header with a subtitle is two lines, and
    // centring the close glyph against both of them floats it off the title.
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  text: { flex: 1, gap: spacing.xxs },
  close: {
    minWidth: MIN_TARGET,
    minHeight: MIN_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    // Pulls the 44pt box back so the glyph stays where the 24pt one sat.
    marginTop: -spacing.sm,
    marginRight: -spacing.sm,
  },
  title: { ...typography.heading, color: colors.text },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary },
})
