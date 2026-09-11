import { EmptyState } from '@/components/ui/ScreenState'
import { parlayStatus } from '@shared/parlays'
import { Stack, useLocalSearchParams } from 'expo-router'
import { ScrollView, StyleSheet, View } from 'react-native'

import { ParlayStatusChip } from '@/components/display/ParlayStatusChip'
import { ParlayView } from '@/components/display/ParlayView'
import { getLoadedParlay } from '@/lib/parlays'
import { colors, spacing } from '@/lib/theme/designTokens'

// A saved parlay, read-only: the same view the build flow shows, minus the
// actions that only make sense while it is still on the week's board.
export default function SavedParlayScreen() {
  const { parlayId } = useLocalSearchParams<{ parlayId: string }>()
  const parlay = getLoadedParlay(parlayId)

  if (!parlay) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Parlay' }} />
        <EmptyState
          icon="bookmark-outline"
          title="Open it from History"
          body="This parlay has not been loaded yet."
        />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Saved parlay' }} />
      <ScrollView contentContainerStyle={styles.body}>
        <ParlayView
          parlay={parlay}
          accessory={<ParlayStatusChip status={parlayStatus(parlay)} />}
        />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  body: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
})
