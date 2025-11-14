// components/tasks/TaskDetailsModal.tsx
import React from 'react'
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Linking,
  Alert
} from 'react-native'
import { TaskWithLabels, TaskAttachment, TaskComment } from '../../types/tasks'
import { STATUS_COLORS, PRIORITY_COLORS } from '../../constants/tasks'
import { formatDate, isOverdue } from '../../utils/taskHelpers'
import { AttachmentList } from './AttachmentList'
import { CommentList } from './CommentList'
import { CommentInput } from './CommentInput'

interface TaskDetailsModalProps {
  visible: boolean
  task: TaskWithLabels | null
  attachments: TaskAttachment[]
  comments: TaskComment[]
  currentUserId: string
  newComment: string
  uploadingFile: boolean
  addingComment: boolean
  onClose: () => void
  onCommentChange: (text: string) => void
  onCommentSubmit: () => void
  onCommentDelete: (commentId: string) => void
  onAttachmentAdd: () => void
  onAttachmentDownload: (attachment: TaskAttachment) => void
  onAttachmentDelete: (attachment: TaskAttachment) => void
  onLabelManage: () => void
  onTaskDelete: () => void
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  visible,
  task,
  attachments,
  comments,
  currentUserId,
  newComment,
  uploadingFile,
  addingComment,
  onClose,
  onCommentChange,
  onCommentSubmit,
  onCommentDelete,
  onAttachmentAdd,
  onAttachmentDownload,
  onAttachmentDelete,
  onLabelManage,
  onTaskDelete
}) => {
  if (!task) return null

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Task Details</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.detailsScrollView}>
          {/* Task Info */}
          <View style={styles.detailsSection}>
            <Text style={styles.detailsTitle}>{task.title}</Text>
            
            <View style={styles.detailsBadges}>
              <View style={[styles.statusBadgeLarge, { backgroundColor: STATUS_COLORS[task.status] }]}>
                <Text style={styles.statusTextLarge}>
                  {task.status.replace('-', ' ').toUpperCase()}
                </Text>
              </View>
              <View style={[styles.priorityBadgeLarge, { backgroundColor: PRIORITY_COLORS[task.priority] }]}>
                <Text style={styles.priorityTextLarge}>
                  {task.priority.toUpperCase()} PRIORITY
                </Text>
              </View>
            </View>

            {task.description ? (
              <Text style={styles.detailsDescription}>{task.description}</Text>
            ) : null}

            <View style={styles.detailsMetaContainer}>
              <View style={styles.detailsMetaItem}>
                <Text style={styles.detailsMetaLabel}>Assigned to:</Text>
                <Text style={styles.detailsMetaValue}>
                  {task.assigned_to_profile?.full_name || 'Unassigned'}
                </Text>
              </View>
              <View style={styles.detailsMetaItem}>
                <Text style={styles.detailsMetaLabel}>Due Date:</Text>
                <Text style={[
                  styles.detailsMetaValue,
                  isOverdue(task.due_date) && styles.overdueText
                ]}>
                  {formatDate(task.due_date)}
                </Text>
                            </View>
            </View>
          </View>

          {/* Labels Section */}
          <View style={styles.detailsSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>🏷️ Labels</Text>
              <TouchableOpacity
                style={styles.manageLabelButton}
                onPress={onLabelManage}
              >
                <Text style={styles.manageLabelButtonText}>Manage</Text>
              </TouchableOpacity>
            </View>
            
            {task.labels && task.labels.length > 0 ? (
              <View style={styles.labelsContainer}>
                {task.labels.map((label) => (
                  <View
                    key={label.id}
                    style={[styles.labelChipLarge, { backgroundColor: label.color + '20', borderColor: label.color }]}
                  >
                    <Text style={[styles.labelChipTextLarge, { color: label.color }]}>
                      {label.name}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyMessage}>No labels assigned</Text>
            )}
          </View>

          {/* Attachments Section */}
          <AttachmentList
            attachments={attachments}
            uploading={uploadingFile}
            onDownload={onAttachmentDownload}
            onDelete={onAttachmentDelete}
            onAdd={onAttachmentAdd}
          />

          {/* Comments Section */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>
              💬 Comments ({comments.length})
            </Text>

            <CommentList
              comments={comments}
              currentUserId={currentUserId}
              onDelete={(commentId) => onCommentDelete(commentId)}
            />

            <CommentInput
              value={newComment}
              onChangeText={onCommentChange}
              onSubmit={onCommentSubmit}
              submitting={addingComment}
            />
          </View>

          {/* Delete Task Button */}
          {(currentUserId === task.created_by || currentUserId === task.assigned_to) && (
            <TouchableOpacity
              style={styles.deleteTaskButton}
              onPress={onTaskDelete}
            >
              <Text style={styles.deleteTaskButtonText}>Delete Task</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    fontSize: 16,
    color: '#6366F1',
    fontWeight: '600',
  },
  detailsScrollView: {
    flex: 1,
  },
  detailsSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  detailsBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statusBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusTextLarge: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  priorityBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priorityTextLarge: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  detailsDescription: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 16,
  },
  detailsMetaContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  detailsMetaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailsMetaLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailsMetaValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  overdueText: {
    color: '#EF4444',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  manageLabelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
  },
  manageLabelButtonText: {
    color: '#6366F1',
    fontSize: 13,
    fontWeight: '600',
  },
  labelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  labelChipLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  labelChipTextLarge: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  deleteTaskButton: {
    backgroundColor: '#EF4444',
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteTaskButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})