import Ionicons from '@expo/vector-icons/Ionicons'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import type { LegalDocument } from '@/lib/legal/content'
import { colors, radius, spacing, typography } from '@/lib/theme/designTokens'

interface LegalDocumentSheetProps {
  document: LegalDocument | null
  onClose: () => void
}

export function LegalDocumentSheet({ document, onClose }: LegalDocumentSheetProps) {
  return (
    <Modal
      visible={document !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{document?.title}</Text>
            <Text style={styles.subtitle}>{document?.subtitle}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {document?.notice ? (
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>{document.notice.title}</Text>
              <Text style={styles.noticeBody}>{document.notice.description}</Text>
            </View>
          ) : null}

          {document?.sections.map(section => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionBody}>{section.description}</Text>
            </View>
          ))}

          {document?.footer ? (
            <View style={styles.footer}>
              <Text style={styles.footerTitle}>{document.footer.title}</Text>
              <Text style={styles.sectionBody}>
                {document.footer.description}
                {document.footer.contact ? ` ${document.footer.contact}` : ''}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerText: { flex: 1, gap: 2 },
  title: { ...typography.h3, color: colors.text },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary },
  body: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },

  notice: {
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  noticeTitle: { ...typography.label, color: colors.secondary },
  noticeBody: { ...typography.bodySmall, color: colors.textSecondary },

  section: { gap: spacing.xs },
  sectionTitle: { ...typography.label, color: colors.text },
  sectionBody: { ...typography.bodySmall, color: colors.textSecondary },

  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  footerTitle: { ...typography.label, color: colors.primary },
})
