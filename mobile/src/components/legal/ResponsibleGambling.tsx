import { SheetHeader } from '@/components/ui/SheetHeader'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Linking, Modal, ScrollView, StyleSheet, Text, View } from 'react-native'

import {
  HELPLINES,
  RESPONSIBLE_PRACTICES,
  WARNING_SIGNS,
  type Helpline,
} from '@shared/legal/content'
import { Card } from '@/components/ui/Card'
import { LinkButton } from '@/components/ui/LinkButton'
import { colors, spacing, typography } from '@/lib/theme/designTokens'

function HelplineCard({ helpline }: { helpline: Helpline }) {
  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>{helpline.name}</Text>
      <Text style={styles.cardBody}>{helpline.description}</Text>
      <View style={styles.cardActions}>
        {helpline.dial ? (
          <LinkButton
            icon="call-outline"
            label={helpline.phone}
            onPress={() => Linking.openURL(`tel:${helpline.dial}`)}
            textStyle={styles.actionText}
          />
        ) : (
          <View style={styles.action}>
            <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.actionMuted}>{helpline.phone}</Text>
          </View>
        )}
        <LinkButton
          icon="open-outline"
          label={helpline.website}
          onPress={() => Linking.openURL(`https://${helpline.website}`)}
          textStyle={styles.actionText}
        />
      </View>
    </Card>
  )
}

export function ResponsibleGambling({
  visible,
  onClose,
}: {
  visible: boolean
  onClose: () => void
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.sheet}>
        <SheetHeader title="Responsible gambling" onClose={onClose} />

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.lede}>
            If gambling is causing problems in your life, help is available.
          </Text>

          <Text style={styles.section}>Get help now</Text>
          {HELPLINES.map(h => (
            <HelplineCard key={h.name} helpline={h} />
          ))}

          <Text style={styles.section}>Warning signs</Text>
          {WARNING_SIGNS.map(sign => (
            <View key={sign} style={styles.listRow}>
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={colors.warning}
                style={styles.listIcon}
              />
              <Text style={styles.listText}>{sign}</Text>
            </View>
          ))}

          <Text style={styles.section}>Responsible practices</Text>
          {RESPONSIBLE_PRACTICES.map(practice => (
            <View key={practice} style={styles.listRow}>
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color={colors.primaryBright}
                style={styles.listIcon}
              />
              <Text style={styles.listText}>{practice}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl },
  lede: { ...typography.body, color: colors.textSecondary },
  section: { ...typography.title, color: colors.text, marginTop: spacing.md },

  card: { gap: spacing.xs },
  cardTitle: { ...typography.label, color: colors.text },
  cardBody: { ...typography.bodySmall, color: colors.textSecondary },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  actionText: { ...typography.bodySmall },
  actionMuted: { ...typography.bodySmall, color: colors.textSecondary },

  listRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  listIcon: { marginTop: 2 },
  listText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
})
