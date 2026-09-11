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
}: LinkButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      hitSlop={HIT_SLOP}
      style={({ pressed }) => [styles.base, pressed && styles.pressed, style]}
    >
      {icon ? <Ionicons name={icon} size={16} color={tint} /> : null}
      <Text style={[styles.label, { color: tint }, textStyle]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
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
