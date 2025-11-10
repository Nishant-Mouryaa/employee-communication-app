// components/chat/MessageBubble.tsx
import React, { useState } from 'react'
import { View, Text, StyleSheet, Pressable, Clipboard, Platform } from 'react-native'
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
  const [isPressed, setIsPressed] = useState(false)

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
    
    if (message.id.startsWith('temp-')) {
      return { icon: '○', color: 'rgba(255, 255, 255, 0.5)', label: 'Sending' }
    }
    
    const readByOthers = message.read_by?.filter(userId => userId !== currentUserId) || []
    const hasBeenRead = readByOthers.length > 0
    const readCount = message.read_count || 0
    
    if (hasBeenRead || readCount > 0) {
      return { 
        icon: '✓✓', 
        color: '#22c55e',
        label: readReceiptText || `Read by ${readByOthers.length || readCount}` 
      }
    }
    
    return { icon: '✓✓', color: 'rgba(255, 255, 255, 0.6)', label: 'Delivered' }
  }

  const readStatus = getReadStatus()

  return (
    <>
      <Pressable 
        onLongPress={handleLongPress} 
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        delayLongPress={500}
      >
        <View style={[styles.messageContainer, isOwn && styles.ownMessageContainer]}>
          <View style={styles.messageContent}>
            {!isOwn && (
              <View style={IS_MOBILE ? styles.avatarMobile : styles.avatar}>
                <View style={styles.avatarGradient}>
                  <Text style={styles.avatarText}>
                    {getUserInitials(message.profiles?.full_name || message.profiles?.username || 'Unknown')}
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.bubbleWrapper}>
              <View style={[
                styles.messageBubble,
                isOwn ? styles.ownMessageBubble : styles.otherMessageBubble,
                isPressed && styles.messageBubblePressed
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
                    {formatMessageTimestamp(message.created_at)}
                  </Text>
                  
                  {readStatus && (
                    <View style={styles.readStatusContainer}>
                      <Text style={[styles.readStatusIcon, { color: readStatus.color }]}>
                        {readStatus.icon}
                      </Text>
                    </View>
                  )}
                </View>
                
                {isOwn && showReadReceipt && readReceiptText && (message.read_count ?? 0) > 0 && (
                  <Text style={styles.readReceiptDetail}>{readReceiptText}</Text>
                )}
              </View>
              
              {/* Reactions positioned outside bubble */}
              {message.reactions && message.reactions.length > 0 && (
                <View style={[
                  styles.reactionsContainer, 
                  isOwn ? styles.reactionsContainerOwn : styles.reactionsContainerOther
                ]}>
                  <MessageReactions
                    reactions={message.reactions}
                    onReactionPress={handleReactionPress}
                    currentUserId={currentUserId}
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      </Pressable>

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
    marginBottom: 16, // Increased to accommodate reactions
    paddingHorizontal: 4,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  messageContent: {
    flexDirection: 'row',
    maxWidth: IS_MOBILE ? '85%' : '70%',
    alignItems: 'flex-end',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  avatarMobile: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
      },
    }),
  },
  avatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bubbleWrapper: {
    position: 'relative',
    marginBottom: 8, // Space for reactions
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 60,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  messageBubblePressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  ownMessageBubble: {
    backgroundColor: '#6366F1',
    borderBottomRightRadius: 6,
    ...Platform.select({
      web: {
        background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
      },
    }),
  },
  otherMessageBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366F1',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  ownMessageText: {
    color: '#ffffff',
  },
  otherMessageText: {
    color: '#1e293b',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
    gap: 6,
  },
  messageTime: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  readStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readStatusIcon: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 12,
  },
  readReceiptDetail: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'right',
    fontWeight: '500',
  },
  reactionsContainer: {
    position: 'absolute',
    bottom: -12, // Position below the bubble
    zIndex: 10, // Ensure it appears above other elements
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 6, // Increased elevation
      },
      web: {
        filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.2))',
      },
    }),
  },
  reactionsContainerOwn: {
    right: 8,
    left: 'auto',
  },
  reactionsContainerOther: {
    left: 8,
    right: 'auto',
  },
})