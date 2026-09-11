import type { TextStyle } from 'react-native'

// Ported from the web client's MUI theme (src/theme.ts) so both clients read
// as the same product. ParlAId is dark-only on every platform.

export const colors = {
  // Brand. `primary` is a FILL colour — white on it measures 5.13:1. As text on
  // our dark surfaces it only reaches 3.25:1, which fails AA, so green type and
  // green icons use `primaryBright` (6.8:1 on the page) instead.
  primary: '#2e7d32', // NFL green
  primaryBright: '#4caf50',
  secondary: '#ff9800', // orange accent

  // Surfaces. The steps are small by necessity on an OLED-black page, so a
  // card is read from its fill *and* its hairline together — never from the
  // fill alone. `sunken` is for wells that controls sit inside.
  background: '#121212',
  sunken: '#0c0c0e',
  surface: '#1c1c20',
  surfaceRaised: '#26262b',

  // Text — MUI dark-palette equivalents
  text: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.72)',
  textDisabled: 'rgba(255, 255, 255, 0.5)',

  // Two hairline weights. `divider` is structural (card edges, list rules);
  // `border` bounds an actual control. It measures 2.67:1 on the page, so a
  // control still needs its fill or its label to reach 1.4.11's 3:1.
  divider: 'rgba(255, 255, 255, 0.14)',
  border: 'rgba(255, 255, 255, 0.30)',

  // Status
  success: '#66bb6a',
  warning: '#ffa726',
  error: '#f44336',
  // `error` is 4.09:1 on `surfaceRaised`, so red text on a raised row reads
  // from this instead (MUI red 300 — 5.04:1 there).
  errorBright: '#e57373',
  // The scrim behind a modal. Two literals were in use — 0.55 and 0.6 — which is
  // how one becomes three.
  scrim: 'rgba(0, 0, 0, 0.55)',
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

// Resolves to the legible-on-dark green, not the fill green: every caller
// paints text, an icon or a 1px chip border with the result.
export const semanticColor: Record<SemanticColor, string> = {
  primary: colors.primaryBright,
  secondary: colors.secondary,
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  info: colors.info,
}

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
} as const

// Every touch target is at least this tall. 44pt is Apple's minimum and
// WCAG 2.5.5's recommendation.
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const
export const MIN_TARGET = 44

// One pressed treatment for the whole app.
export const PRESSED_OPACITY = 0.7

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const

// Eight steps, each with its own line height. Components take a role from here
// and never override fontSize inline — an inline override is a ninth size that
// belongs to no scale.
//
// Weight comes from `fontFamily`, never from `fontWeight`: the app loads four
// named Inter faces, so a bare `fontWeight: '700'` silently falls back to
// San Francisco and mixes typefaces mid-screen.
export const typography = {
  display: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 34, letterSpacing: -0.6 },
  heading: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 28, letterSpacing: -0.3 },
  title: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.1 },
  button: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20, letterSpacing: 0.2 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodySmall: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 16 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  micro: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14 },
  // Odds and probabilities read as columns; the web uses tabular-nums too.
  numeric: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, fontVariant: ['tabular-nums'] },
  numericSmall: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>
