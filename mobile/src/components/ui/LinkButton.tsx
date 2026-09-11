import Ionicons from '@expo/vector-icons/Ionicons'
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'

import {
  colors,
  HIT_SLOP,
  MIN_TARGET,
  PRESSED_OPACITY,
  spacing,
  typography,
} from '@/lib/theme/designTokens'

interface LinkButtonProps {
  label: string
  onPress: () => void
  icon?: keyof typeof Ionicons.glyphMap
  tint?: string
  // `link` leaves the screen for a URL or a document; `button` acts in place.
  role?: 'link' | 'button'
  textStyle?: StyleProp<TextStyle>
  style?: StyleProp<ViewStyle>
  // A link inside running text takes the line's height, not a 44pt box — a
  // box that tall pushes the surrounding lines apart. The tap area comes from
  // hit slop instead, which is the allowance both WCAG and the HIG make for
  // inline links.
  inline?: boolean
}

// Inline text that acts. Each site used to wrap its own Text in its own
// Pressable, and most of them came out under 44pt; this is the one shape.
export function LinkButton({
  label,
  onPress,
  icon,
  tint = colors.primaryBright,
  role = 'link',
  textStyle,
  style,
  inline = false,
}: LinkButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      hitSlop={inline ? INLINE_HIT_SLOP : HIT_SLOP}
      style={({ pressed }) => [
        inline ? styles.inline : styles.base,
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={16} color={tint} /> : null}
      <Text style={[styles.label, { color: tint }, textStyle]}>{label}</Text>
    </Pressable>
  )
}

// Enough above and below a 13pt line to reach the 44pt target without a box.
const INLINE_HIT_SLOP = { top: 14, bottom: 14, left: 6, right: 6 } as const

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: MIN_TARGET,
  },
  label: { ...typography.label },
  pressed: { opacity: PRESSED_OPACITY },
})
