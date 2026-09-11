import { Stack } from 'expo-router'

import { colors, typography } from '@/lib/theme/designTokens'

// The Build tab is a stack now: a board of games, with the game and its parlay
// as pushed screens. One job per screen, and a back stack that behaves the way
// the platform's does (DESIGN #1).
export default function BuildLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primaryBright,
        headerTitleStyle: { ...typography.title, color: colors.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {/* The list carries its own large header, so the nav bar would only
          repeat it — the same reason the tab header was removed. */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="game/[gameId]" />
      <Stack.Screen name="parlay/[gameIds]" />
    </Stack>
  )
}
