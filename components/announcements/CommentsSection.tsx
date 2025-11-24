// components/announcements/CommentsSection.tsx
import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert
} from 'react-native'
import { useComments } from '../../hooks/useComments'
import { useAuth } from '../../hooks/useAuth'
import { useTenant } from '../../hooks/useTenant'
import { commentService } from '../../services/commentService'
import { Comment } from '../../types/announcement'

interface CommentsSectionProps {
  announcementId: string
  canComment: boolean
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  announcementId,
  canComment
}) => {
  const { user } = useAuth()
  const { organizationId } = useTenant()
  const { comments, loading, fetchComments } = useComments(announcementId, organizationId)
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmitComment = async () => {
    if (!user || !organizationId || !newComment.trim()) return

    try {
      setSubmitting(true)
      await commentService.createComment(
        announcementId,
        user.id,
        newComment,
        organizationId,
        replyTo || undefined
      )
      setNewComment('')
      setReplyTo(null)
      fetchComments()
    } catch (error) {
      Alert.alert('Error', 'Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim() || !organizationId) return

    try {
      setSubmitting(true)
      await commentService.updateComment(commentId, editContent, organizationId)
      setEditingComment(null)
      setEditContent('')
      fetchComments()
    } catch (error) {
      Alert.alert('Error', 'Failed to update comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!organizationId) return
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await commentService.deleteComment(commentId, organizationId)
              fetchComments()
            } catch (error) {
              Alert.alert('Error', 'Failed to delete comment')
            }
          }
        }
      ]
    )
  }

  const renderComment = (comment: Comment, isReply: boolean = false) => (
    <View style={[styles.commentContainer, isReply && styles.replyContainer]}>
      <View style={styles.commentHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {comment.profiles?.full_name?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.commentMeta}>
          <Text style={styles.commentAuthor}>
            {comment.profiles?.full_name || 'Unknown User'}
          </Text>
          <Text style={styles.commentDate}>
            {new Date(comment.created_at).toLocaleDateString()}
            {comment.is_edited && ' (edited)'}
          </Text>
        </View>
      </View>

      {editingComment === comment.id ? (
        <View style={styles.editContainer}>
          <TextInput
            style={styles.editInput}
            value={editContent}
            onChangeText={setEditContent}
            multiline
            autoFocus
          />
          <View style={styles.editActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setEditingComment(null)
                setEditContent('')
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => handleEditComment(comment.id)}
              disabled={submitting}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.commentContent}>{comment.content}</Text>
          
          <View style={styles.commentActions}>
            {!isReply && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setReplyTo(comment.id)}
              >
                <Text style={styles.actionButtonText}>
                  Reply {comment.reply_count > 0 && `(${comment.reply_count})`}
                </Text>
              </TouchableOpacity>
            )}
            
            {user?.id === comment.user_id && (
              <>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    setEditingComment(comment.id)
                    setEditContent(comment.content)
                  }}
                >
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteComment(comment.id)}
                >
                  <Text style={[styles.actionButtonText, styles.deleteText]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </>
      )}

      {/* Render replies */}
      {comment.replies && comment.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {comment.replies.map(reply => (
            <View key={reply.id}>
              {renderComment(reply, true)}
            </View>
          ))}
        </View>
      )}

      {/* Reply input */}
      {replyTo === comment.id && (
        <View style={styles.replyInputContainer}>
          <TextInput
            style={styles.replyInput}
            placeholder="Write a reply..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <View style={styles.replyActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setReplyTo(null)
                setNewComment('')
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
            >
              <Text style={styles.submitButtonText}>Reply</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Comments ({comments.length})
      </Text>

      {canComment && !replyTo && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Write a comment..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!newComment.trim() || submitting) && styles.buttonDisabled
            ]}
            onPress={handleSubmitComment}
            disabled={!newComment.trim() || submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Posting...' : 'Post'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderComment(item)}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No comments yet. Be the first to comment!
          </Text>
        }
        refreshing={loading}
        onRefresh={fetchComments}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  commentContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  replyContainer: {
    marginLeft: 20,
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderLeftWidth: 2,
    borderLeftColor: '#007AFF',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  commentMeta: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  commentDate: {
    fontSize: 12,
    color: '#64748b',
  },
  commentContent: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    paddingVertical: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  deleteText: {
    color: '#dc2626',
  },
  repliesContainer: {
    marginTop: 8,
  },
  replyInputContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  replyInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  replyActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  editContainer: {
    marginTop: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
    paddingVertical: 24,
  },
})