import { EmptyState } from '@/components/ui/ScreenState'
import { PinnedActions } from '@/components/ui/PinnedActions'
import { parlayStatus } from '@shared/parlays'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, View } from 'react-native'

import { ParlayStatusChip } from '@/components/display/ParlayStatusChip'
import { ParlayView } from '@/components/display/ParlayView'
import { Button } from '@/components/ui/Button'
import { deleteSavedParlay, getLoadedParlay } from '@/lib/parlays'
import { colors, spacing } from '@/lib/theme/designTokens'

// A saved parlay, read-only: the same view the build flow shows, minus the
// actions that only make sense while it is still on the week's board.
export default function SavedParlayScreen() {
  const { parlayId } = useLocalSearchParams<{ parlayId: string }>()
  const parlay = getLoadedParlay(parlayId)
  // The pinned bar floats over the scroll view, so the content reserves its
  // measured height rather than a guess.
  const [actionsHeight, setActionsHeight] = useState(0)
  const [deleting, setDeleting] = useState(false)

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

  const remove = async () => {
    setDeleting(true)
    try {
      await deleteSavedParlay(parlay.parlayId)
      router.back()
    } catch (e) {
      // No auto-retry: the failure is surfaced and the user decides.
      setDeleting(false)
      Alert.alert(
        'Could not delete this parlay',
        e instanceof Error ? e.message : 'Please try again.'
      )
    }
  }

  // Confirmed, and the destructive choice is not the default: this is the
  // only copy of a saved parlay, and a graded one is part of the record.
  const confirmRemove = () =>
    Alert.alert(
      'Delete this parlay?',
      'It is removed from History for good. If the game has not started, you can build it again from the Build tab.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void remove() },
      ]
    )

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Saved parlay' }} />
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: actionsHeight + spacing.md }]}
      >
        <ParlayView
          parlay={parlay}
          accessory={<ParlayStatusChip status={parlayStatus(parlay)} />}
        />
      </ScrollView>

      <PinnedActions onLayout={e => setActionsHeight(e.nativeEvent.layout.height)}>
        <Button
          variant="danger"
          icon="trash-outline"
          label="Delete from History"
          loading={deleting}
          onPress={confirmRemove}
        />
      </PinnedActions>
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
  body: { padding: spacing.md, gap: spacing.md },
})
