import type { TextStyle } from 'react-native'

// Ported from the web client's MUI theme (src/theme.ts) so both clients read
// as the same product. ParlAId is dark-only on every platform.

export const colors = {
  // Brand
  primary: '#2e7d32', // NFL green
  primaryMuted: '#1b5e20',
  secondary: '#ff9800', // orange accent

  // Surfaces
  background: '#121212',
  surface: '#1e1e1e',
  surfaceRaised: '#2a2a2a',

  // Text — MUI dark-palette equivalents
  text: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textDisabled: 'rgba(255, 255, 255, 0.5)',
  divider: 'rgba(255, 255, 255, 0.12)',

  // Status
  success: '#66bb6a',
  warning: '#ffa726',
  error: '#f44336',
  info: '#29b6f6',
} as const

// `shared/` helpers such as getBetTypeColor/getConfidenceColor return semantic
// names (MUI's vocabulary on web). This resolves those names to real values.
export type SemanticColor =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'

export const semanticColor: Record<SemanticColor, string> = {
  primary: colors.primary,
  secondary: colors.secondary,
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  info: colors.info,
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

export const radius = {
  sm: 4,
  md: 8, // matches the web theme's button radius
  lg: 12,
  pill: 999,
} as const

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const

export const typography = {
  h1: { fontFamily: fonts.bold, fontSize: 32, letterSpacing: -0.64 },
  h2: { fontFamily: fonts.bold, fontSize: 26, letterSpacing: -0.26 },
  h3: { fontFamily: fonts.semibold, fontSize: 22 },
  title: { fontFamily: fonts.semibold, fontSize: 18 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 24 },
  bodySmall: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  label: { fontFamily: fonts.medium, fontSize: 13 },
  button: { fontFamily: fonts.semibold, fontSize: 16, letterSpacing: 0.32 },
  // Odds and probabilities read as columns; the web uses tabular-nums too.
  numeric: { fontFamily: fonts.medium, fontSize: 15, fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>
