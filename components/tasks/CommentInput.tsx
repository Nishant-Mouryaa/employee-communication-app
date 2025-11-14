// components/tasks/CommentInput.tsx
import React from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, Text, ActivityIndicator } from 'react-native'
import { MAX_COMMENT_LENGTH } from '../../constants/tasks'

interface CommentInputProps {
  value: string
  onChangeText: (text: string) => void
  onSubmit: () => void
  submitting: boolean
}

export const CommentInput: React.FC<CommentInputProps> = ({
  value,
  onChangeText,
  onSubmit,
  submitting
}) => {
  return (
    <View style={styles.addCommentContainer}>
      <TextInput
        style={styles.commentInput}
        placeholder="Add a comment..."
        value={value}
        onChangeText={onChangeText}
        multiline
        maxLength={MAX_COMMENT_LENGTH}
      />
      <TouchableOpacity
        style={[
          styles.sendCommentButton,
          (!value.trim() || submitting) && styles.sendCommentButtonDisabled
        ]}
        onPress={onSubmit}
        disabled={!value.trim() || submitting}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text style={styles.sendCommentButtonText}>Send</Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  addCommentContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
    maxHeight: 100,
  },
  sendCommentButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  sendCommentButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  sendCommentButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
})