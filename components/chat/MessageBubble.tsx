// components/chat/MessageBubble.tsx
import React, { useState } from 'react'
import { View, Text, StyleSheet, Pressable, Clipboard } from 'react-native'
import { Message } from '../../types/chat'
import { formatMessageTimestamp, getUserInitials } from '../../utils/chatHelpers'
import { IS_MOBILE } from '../../constants/chat'
import { MessageReactions } from './MessageReactions'
import { ReactionPicker } from './ReactionPicker'
import { MessageContextMenu } from './MessageContextMenu'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  onLongPress: () => void
  onReaction: (messageId: string, emoji: string) => void
  onDelete?: (messageId: string) => void
  onEdit?: (messageId: string, content: string) => void
  readReceiptText?: string
  showReadReceipt?: boolean
  currentUserId?: string
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  onLongPress,
  onReaction,
  onDelete,
  onEdit,
  readReceiptText,
  showReadReceipt,
  currentUserId
}) => {
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })

  const handleLongPress = (event: any) => {
    const { pageX, pageY } = event.nativeEvent
    setMenuPosition({ x: pageX, y: pageY })
    setShowContextMenu(true)
  }

  const handleReactionSelect = (emoji: string) => {
    onReaction(message.id, emoji)
    setShowReactionPicker(false)
  }

  const handleReactionPress = (emoji: string) => {
    onReaction(message.id, emoji)
  }

  const handleCopy = () => {
    Clipboard.setString(message.content)
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(message.id)
    }
  }

  const handleEdit = () => {
    if (onEdit) {
      onEdit(message.id, message.content)
    }
  }

  // Determine read status
  const getReadStatus = () => {
    if (!isOwn || !showReadReceipt) return null
    
    // Temporary message (not yet sent)
    if (message.id.startsWith('temp-')) {
      return { icon: '🕐', color: 'rgba(255, 255, 255, 0.5)', label: 'Sending' }
    }
    
    // Check if message has been read by others (excluding the sender)
    const readByOthers = message.read_by?.filter(userId => userId !== currentUserId) || []
    const hasBeenRead = readByOthers.length > 0
    
    // Also check read_count as a backup
    const readCount = message.read_count || 0
    
    // Log for debugging
    console.log('Read status for message:', message.id, {
      read_by: message.read_by,
      read_count: message.read_count,
      readByOthers,
      hasBeenRead,
      readReceiptText
    })
    
    if (hasBeenRead || readCount > 0) {
      return { 
        icon: '✓✓', 
        color: '#4ade80', // Green color
        label: readReceiptText || `Read by ${readByOthers.length || readCount}` 
      }
    }
    
    // Delivered but not read (grey ticks)
    return { icon: '✓✓', color: 'rgba(255, 255, 255, 0.7)', label: 'Delivered' }
  }

  const readStatus = getReadStatus()

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
                
                {/* Read Status with Ticks */}
                {readStatus && (
                  <View style={styles.readStatusContainer}>
                    <Text style={[styles.readStatusIcon, { color: readStatus.color }]}>
                      {readStatus.icon}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Optional: Show detailed read info */}
              {isOwn && showReadReceipt && readReceiptText && (message.read_count ?? 0) > 0 && (
                <Text style={styles.readReceiptDetail}>{readReceiptText}</Text>
              )}
            </View>
          </View>
        </View>
      </Pressable>

      {/* Context Menu */}
      <MessageContextMenu
        visible={showContextMenu}
        onClose={() => setShowContextMenu(false)}
        position={menuPosition}
        isOwnMessage={isOwn}
        onReact={() => setShowReactionPicker(true)}
        onCopy={handleCopy}
        onEdit={isOwn ? handleEdit : undefined}
        onDelete={isOwn ? handleDelete : undefined}
      />

      {/* Reaction Picker */}
      <ReactionPicker
        visible={showReactionPicker}
        onReactionSelect={handleReactionSelect}
        onClose={() => setShowReactionPicker(false)}
        position={menuPosition}
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
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 6,
  },
  messageTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  readStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readStatusIcon: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 14,
  },
  readReceiptDetail: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
    marginTop: 2,
    textAlign: 'right',
  },
})