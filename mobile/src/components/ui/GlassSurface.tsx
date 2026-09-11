import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { StyleSheet, View, type ViewProps } from 'react-native'

import { colors } from '@/lib/theme/designTokens'

// Resolved once: it is a device capability, not a render-time decision, and the
// native call is behind a try/catch because the module is not present in every
// runtime the app is opened in (Expo Go, web).
const LIQUID_GLASS = (() => {
  try {
    return isLiquidGlassAvailable()
  } catch {
    return false
  }
})()

export const glassAvailable = LIQUID_GLASS

/**
 * Native chrome — the tab bar, pinned action areas and sheets — where iOS 26
 * does glass best and where the flat fallback is least noticeable (DESIGN #16).
 * Everything else keeps the existing flat surfaces.
 */
export function GlassSurface({ style, children, ...rest }: ViewProps) {
  if (LIQUID_GLASS) {
    return (
      <GlassView
        glassEffectStyle="regular"
        // The app is dark-only, so the glass must not follow a light system
        // appearance and wash out white type.
        colorScheme="dark"
        style={style}
        {...rest}
      >
        {children}
      </GlassView>
    )
  }
  return (
    <View style={[styles.flat, style]} {...rest}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  flat: { backgroundColor: colors.surface },
})
