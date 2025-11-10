// components/chat/MessageBubble.tsx
import React, { useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Message } from '../../types/chat'
import { formatMessageTimestamp, getUserInitials } from '../../utils/chatHelpers'
import { IS_MOBILE } from '../../constants/chat'
import { MessageReactions } from './MessageReactions'
import { ReactionPicker } from './ReactionPicker'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  onLongPress: () => void
  onReaction: (messageId: string, emoji: string) => void
  readReceiptText?: string
  showReadReceipt?: boolean
  currentUserId?: string
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  onLongPress,
  onReaction,
  readReceiptText,
  showReadReceipt,
  currentUserId
}) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 })

  const handleLongPress = (event: any) => {
    const { pageX, pageY } = event.nativeEvent
    setPickerPosition({ x: pageX, y: pageY })
    setShowReactionPicker(true)
  }

  const handleReactionSelect = (emoji: string) => {
    onReaction(message.id, emoji)
  }

  const handleReactionPress = (emoji: string) => {
    onReaction(message.id, emoji)
  }

  return (
    <>
      <Pressable 
        onLongPress={handleLongPress} 
        delayLongPress={500}
      >
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
              
              {/* Reactions */}
              {message.reactions && message.reactions.length > 0 && (
                <MessageReactions
                  reactions={message.reactions}
                  onReactionPress={handleReactionPress}
                  currentUserId={currentUserId}
                />
              )}

              <View style={styles.messageFooter}>
                <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>
                  {formatMessageTimestamp(message.created_at)}
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

      <ReactionPicker
        visible={showReactionPicker}
        onReactionSelect={handleReactionSelect}
        onClose={() => setShowReactionPicker(false)}
        position={pickerPosition}
      />
    </>
  )
}

const styles = StyleSheet.create({
  messageContainer: {
    marginBottom: 8,
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