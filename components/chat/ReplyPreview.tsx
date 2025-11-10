// components/chat/ReplyPreview.tsx
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native'
import { Message } from '../../types/chat'

interface ReplyPreviewProps {
  message: Message
  onCancel?: () => void
  isInMessage?: boolean
  onPress?: () => void
}

export const ReplyPreview: React.FC<ReplyPreviewProps> = ({
  message,
  onCancel,
  isInMessage = false,
  onPress,
}) => {
  const Container = onPress ? Pressable : View

  return (
    <Container
      style={[
        styles.replyContainer,
        isInMessage && styles.replyContainerInMessage
      ]}
      onPress={onPress}
    >
      <View style={styles.replyBorder} />
      <View style={styles.replyContent}>
        <Text style={[styles.replyAuthor, isInMessage && styles.replyAuthorInMessage]} numberOfLines={1}>
          {message.profiles?.full_name || message.profiles?.username || 'Unknown User'}
        </Text>
        <Text style={[styles.replyText, isInMessage && styles.replyTextInMessage]} numberOfLines={2}>
          {message.content}
        </Text>
      </View>
      {onCancel && (
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>✕</Text>
        </TouchableOpacity>
      )}
    </Container>
  )
}

const styles = StyleSheet.create({
  replyContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  replyContainerInMessage: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: 8,
  },
  replyBorder: {
    width: 3,
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 2,
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 2,
  },
  replyAuthorInMessage: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  replyText: {
    fontSize: 13,
    color: '#64748b',
  },
  replyTextInMessage: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  cancelButton: {
    padding: 8,
    marginLeft: 8,
  },
  cancelButtonText: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: '600',
  },
})