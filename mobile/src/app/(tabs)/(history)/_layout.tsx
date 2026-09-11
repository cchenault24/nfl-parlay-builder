import { Stack } from 'expo-router'

import { colors, typography } from '@/lib/theme/designTokens'

// A stack, like Build: the list, with a saved parlay as a pushed screen. The
// cards used to be inert — a saved parlay had nowhere to open into.
export default function HistoryLayout() {
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
      <Stack.Screen name="index" options={{ headerShown: false, title: 'History' }} />
      <Stack.Screen name="saved/[parlayId]" />
    </Stack>
  )
}
