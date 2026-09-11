import type { ViewStyle } from 'react-native'

import { colors } from '@/lib/theme/designTokens'

// Shared so a screen can hide the tab bar and put it back exactly as it was.
// Restoring with `undefined` would clear the layout's own styling instead.
export const TAB_BAR_STYLE: ViewStyle = {
  backgroundColor: colors.surface,
  borderTopColor: colors.divider,
}

export const TAB_BAR_HIDDEN: ViewStyle = { display: 'none' }
