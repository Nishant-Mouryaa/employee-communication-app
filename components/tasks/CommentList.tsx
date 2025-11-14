// components/tasks/CommentList.tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { TaskComment } from '../../types/tasks'
import { formatDateTime } from '../../utils/taskHelpers'

interface CommentListProps {
  comments: TaskComment[]
  currentUserId: string
  onDelete: (commentId: string) => void
}

export const CommentList: React.FC<CommentListProps> = ({
  comments,
  currentUserId,
  onDelete
}) => {
  if (comments.length === 0) {
    return <Text style={styles.emptyMessage}>No comments yet</Text>
  }

  return (
    <View style={styles.commentsListContainer}>
      {comments.map((comment) => (
        <View key={comment.id} style={styles.commentItem}>
          <View style={styles.commentHeader}>
            <View style={styles.commentAuthorInfo}>
              <Text style={styles.commentAuthor}>
                {comment.user_profile?.full_name || comment.user_profile?.username || 'Unknown'}
              </Text>
              <Text style={styles.commentTime}>
                {formatDateTime(comment.created_at)}
              </Text>
            </View>
            {comment.user_id === currentUserId && (
              <TouchableOpacity onPress={() => onDelete(comment.id)}>
                <Text style={styles.deleteCommentButton}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.commentText}>{comment.comment}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  commentsListContainer: {
    marginTop: 8,
    gap: 12,
  },
  commentItem: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthorInfo: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  commentTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  deleteCommentButton: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  commentText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
})