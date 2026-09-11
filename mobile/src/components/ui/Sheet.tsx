import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { GlassSurface } from '@/components/ui/GlassSurface'
import {
  colors,
  MIN_TARGET,
  PRESSED_OPACITY,
  radius,
  spacing,
  typography,
} from '@/lib/theme/designTokens'

interface SheetProps {
  visible: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  // Label for the confirming action. It only ever dismisses — every control in
  // a sheet applies as it is touched, so there is nothing to commit.
}

/**
 * A bottom sheet over the current screen. The scrim is its own dismiss target,
 * and `Done` is a real 44pt control rather than a bare word — both were caught
 * in the canvas review.
 */
export function Sheet({ visible, title, onClose, children }: SheetProps) {
  const insets = useSafeAreaInsets()

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.scrim}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={`Close ${title}`}
      />
      <View style={styles.dock} pointerEvents="box-none">
        <GlassSurface style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              style={({ pressed }) => [styles.done, pressed && styles.pressed]}
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </GlassSurface>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  dock: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    // Never taller than most of the screen, so the scrim stays a visible way out.
    maxHeight: '86%',
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  title: { ...typography.heading, color: colors.text, flex: 1 },
  done: {
    minHeight: MIN_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  doneText: { ...typography.button, color: colors.primaryBright },
  pressed: { opacity: PRESSED_OPACITY },
  body: { gap: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
})
