// components/tasks/AttachmentList.tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { TaskAttachment } from '../../types/tasks'
import { formatFileSize } from '../../utils/taskHelpers'

interface AttachmentListProps {
  attachments: TaskAttachment[]
  uploading: boolean
  onDownload: (attachment: TaskAttachment) => void
  onDelete: (attachment: TaskAttachment) => void
  onAdd: () => void
}

export const AttachmentList: React.FC<AttachmentListProps> = ({
  attachments,
  uploading,
  onDownload,
  onDelete,
  onAdd
}) => {
  return (
    <View style={styles.detailsSection}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>
          📎 Attachments ({attachments.length})
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={onAdd}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#6366F1" />
          ) : (
            <Text style={styles.addButtonText}>+ Add</Text>
          )}
        </TouchableOpacity>
      </View>

      {attachments.length > 0 ? (
        <View style={styles.attachmentsListContainer}>
          {attachments.map((attachment) => (
            <View key={attachment.id} style={styles.attachmentItemLarge}>
              <TouchableOpacity
                style={styles.attachmentInfoLarge}
                onPress={() => onDownload(attachment)}
              >
                <Text style={styles.attachmentNameLarge} numberOfLines={1}>
                  📄 {attachment.file_name}
                </Text>
                <Text style={styles.attachmentSizeLarge}>
                  {formatFileSize(attachment.file_size)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteAttachmentButtonLarge}
                onPress={() => onDelete(attachment)}
              >
                <Text style={styles.deleteAttachmentTextLarge}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyMessage}>No attachments</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  detailsSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#6366F1',
    fontSize: 13,
    fontWeight: '600',
  },
  attachmentsListContainer: {
    gap: 8,
  },
  attachmentItemLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  attachmentInfoLarge: {
    flex: 1,
    marginRight: 8,
  },
  attachmentNameLarge: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    marginBottom: 4,
  },
  attachmentSizeLarge: {
    fontSize: 12,
    color: '#6B7280',
  },
  deleteAttachmentButtonLarge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAttachmentTextLarge: {
    color: '#EF4444',
    fontSize: 20,
    fontWeight: '600',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
})