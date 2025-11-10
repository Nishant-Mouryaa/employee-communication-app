// components/chat/MessageBubble.tsx
import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Message } from '../../types/chat'
import { formatTime, getUserInitials } from '../../utils/chatHelpers'
import { IS_MOBILE } from '../../constants/chat'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  onLongPress: () => void
  readReceiptText?: string
  showReadReceipt?: boolean
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  onLongPress,
  readReceiptText,
  showReadReceipt
}) => {
  return (
    <Pressable onLongPress={onLongPress} delayLongPress={500}>
      <View style={[styles.messageContainer, isOwn && styles.ownMessageContainer]}>
        <View style={styles.messageContent}>
          {!isOwn && (
            <View style={IS_MOBILE ? styles.avatarMobile : styles.avatar}>
              <Text style={styles.avatarText}>
                {getUserInitials(message.profiles?.full_name || message.profiles?.username || 'Unknown')}
              </Text>
            </View>
          )}
          <View style={[
            styles.messageBubble,
            isOwn ? styles.ownMessageBubble : styles.otherMessageBubble
          ]}>
            {!isOwn && (
              <Text style={styles.userName}>
                {message.profiles?.full_name || message.profiles?.username || 'Unknown User'}
              </Text>
            )}
            <Text style={[
              styles.messageText,
              isOwn ? styles.ownMessageText : styles.otherMessageText
            ]}>
              {message.content}
            </Text>
            <View style={styles.messageFooter}>
              <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>
                {formatTime(message.created_at)}
              </Text>
              {isOwn && showReadReceipt && readReceiptText && (
                <View style={styles.readReceiptContainer}>
                  <Text style={styles.readReceiptText}>{readReceiptText}</Text>
                  {message.read_count && message.read_count > 0 && (
                    <Text style={styles.readReceiptCheckmark}>✓✓</Text>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  messageContainer: {
    marginBottom: 16,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  messageContent: {
    flexDirection: 'row',
    maxWidth: IS_MOBILE ? '85%' : '80%',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    alignSelf: 'flex-end',
  },
  avatarMobile: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  avatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    flex: 1,
  },
  ownMessageBubble: {
    backgroundColor: '#6366F1',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#f1f5f9',
    borderBottomLeftRadius: 4,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  ownMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: '#334155',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  readReceiptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  readReceiptText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
  },
  readReceiptCheckmark: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
        marginLeft: 4,
  },
})