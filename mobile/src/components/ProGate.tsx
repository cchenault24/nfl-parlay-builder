import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, radius, spacing, typography } from '@/lib/theme/designTokens'

interface ProGateProps {
  locked: boolean
  // What the user is being denied, in their words — "the aggressive risk
  // level". Reads inside a sentence, so no leading capital.
  label: string
  onUpgrade: () => void
  children: React.ReactNode
}

// Native counterpart of the web ProGate. A locked control stays rendered and
// legible rather than hidden: the conversion moment is a parlay the user
// already likes and wants to tweak, not an empty state after they run out.
//
// `pointerEvents="none"` on the wrapper is what makes this work — the child
// controls keep their appearance but stop receiving touches, so the overlay
// above them gets the tap and can offer the upgrade instead. The same wrapper
// is hidden from VoiceOver, or the gated controls stay individually focusable
// and announce themselves as tappable when they are not.
export default function ProGate({ locked, label, onUpgrade, children }: ProGateProps) {
  if (!locked) {
    return <>{children}</>
  }

  return (
    <View style={styles.wrap}>
      <View
        pointerEvents="none"
        style={styles.dimmed}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {children}
      </View>

      <Pressable
        onPress={onUpgrade}
        accessibilityRole="button"
        accessibilityLabel={`Upgrade to Pro to use ${label}`}
        style={StyleSheet.absoluteFill}
      />

      <View pointerEvents="none" style={styles.badge}>
        <Ionicons name="lock-closed" size={9} color={colors.background} />
        <Text style={styles.badgeText}>PRO</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  dimmed: {
    opacity: 0.45,
  },
  badge: {
    position: 'absolute',
    top: -spacing.sm,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.secondary,
  },
  badgeText: {
    ...typography.micro,
    fontSize: 10,
    letterSpacing: 0.4,
    color: colors.background,
  },
})
