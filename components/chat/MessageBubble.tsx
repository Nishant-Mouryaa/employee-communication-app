// components/chat/MessageBubble.tsx
import React, { useState } from 'react'
import { View, Text, StyleSheet, Pressable, Clipboard, Platform, TouchableOpacity, Linking, Image } from 'react-native'
import { Message, MessageAttachment } from '../../types/chat'
import { formatFileSize, formatMessageTimestamp, getUserInitials } from '../../utils/chatHelpers'
import { IS_MOBILE } from '../../constants/chat'
import { MessageReactions } from './MessageReactions'
import { ReactionPicker } from './ReactionPicker'
import { MessageContextMenu } from './MessageContextMenu'
import { ReplyPreview } from './ReplyPreview'
import { MessageText } from './MessageText'
import { MessageLinkPreviews } from './LinkPreview'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  onLongPress: () => void
  onReaction: (messageId: string, emoji: string) => void
  onDelete?: (messageId: string) => void
  onEdit?: () => void // Changed - now just triggers edit mode
  onReply?: (message: Message) => void
  onReplyPress?: (messageId: string) => void
  readReceiptText?: string
  showReadReceipt?: boolean
  currentUserId?: string
  onStar?: (messageId: string) => void
  onPin?: (messageId: string) => void
  onConvertToTask?: (message: Message) => void
  onCreateMeeting?: (message: Message) => void
  canPin?: boolean
}


export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  onLongPress,
  onReaction,
  onDelete,
  onEdit,
  onReply,
  onReplyPress,
  readReceiptText,
  showReadReceipt,
  currentUserId,
  onStar,
  onPin,
  onConvertToTask,
  onCreateMeeting,
  canPin,
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
    onEdit() // Just call it, parent will handle the message
  }
}

  const handleReply = () => {
    if (onReply) {
      onReply(message)
    }
  }

  const handleStar = () => {
    if (onStar) {
      onStar(message.id)
    }
  }

  const handlePin = () => {
    if (onPin) {
      onPin(message.id)
    }
  }

  const handleConvertToTask = () => {
    if (onConvertToTask) {
      onConvertToTask(message)
    }
  }

  const handleCreateMeeting = () => {
    if (onCreateMeeting) {
      onCreateMeeting(message)
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
  const attachments = message.attachments ?? []

  const handleOpenAttachment = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Failed to open attachment', err))
  }

  const renderAttachment = (attachment: MessageAttachment) => {
    const key = `${message.id}-${attachment.id}`

    if (attachment.type === 'image') {
      return (
        <TouchableOpacity
          key={key}
          style={styles.attachmentImageWrapper}
          onPress={() => handleOpenAttachment(attachment.url)}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: attachment.thumbnail_url || attachment.url }}
            style={styles.attachmentImage}
            resizeMode="cover"
          />
            <View style={styles.attachmentOverlay}>
              {attachment.name ? (
                <Text style={styles.attachmentOverlayName} numberOfLines={1}>
                  {attachment.name}
                </Text>
              ) : null}
              {attachment.size ? (
                <Text style={styles.attachmentOverlayMeta}>
                  {formatFileSize(attachment.size)}
                </Text>
              ) : null}
            </View>
        </TouchableOpacity>
      )
    }

    const label = attachment.name || 'Attachment'

    return (
      <TouchableOpacity
        key={key}
        style={styles.attachmentFileWrapper}
        onPress={() => handleOpenAttachment(attachment.url)}
        activeOpacity={0.8}
      >
        <View style={styles.attachmentFileIcon}>
          <Text style={styles.attachmentFileIconText}>
            {attachment.type === 'video' ? '🎬' : attachment.type === 'audio' ? '🎵' : '📄'}
          </Text>
        </View>
        <View style={styles.attachmentFileInfo}>
          <Text numberOfLines={2} style={styles.attachmentFileName}>{label}</Text>
          {(attachment.mime_type || attachment.size) && (
            <Text numberOfLines={1} style={styles.attachmentFileMeta}>
              {[attachment.mime_type, attachment.size ? formatFileSize(attachment.size) : null]
                .filter(Boolean)
                .join(' • ')}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    )
  }

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
                isPressed && styles.messageBubblePressed,
                message.is_pinned && styles.pinnedMessage
              ]}>
                {message.is_pinned && (
                  <View style={styles.pinnedIndicator}>
                    <Text style={styles.pinnedIcon}>📌</Text>
                    <Text style={styles.pinnedText}>Pinned</Text>
                  </View>
                )}
                {!isOwn && (
                  <Text style={styles.userName}>
                    {message.profiles?.full_name || message.profiles?.username || 'Unknown User'}
                  </Text>
                )}

                {/* Reply Preview in Message */}
                {message.reply_message && onReplyPress && (
                  <ReplyPreview
                    message={message.reply_message}
                    isInMessage={isOwn}
                    onPress={() => onReplyPress(message.reply_to!)}
                  />
                )}

                {attachments.length > 0 && (
                  <View style={styles.attachmentsContainer}>
                    {attachments.map(renderAttachment)}
                  </View>
                )}

                {message.content ? (
                  <>
                    <MessageText content={message.content} style={styles.messageText} />
                    <MessageLinkPreviews content={message.content} />
                  </>
                ) : null}
                
                <View style={styles.messageFooter}>
  <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>
    {formatMessageTimestamp(message.created_at)}
    {message.is_edited && (
      <Text style={styles.editedIndicator}> (edited)</Text>
    )}
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
                <View style={[styles.reactionsContainer, isOwn && styles.reactionsContainerOwn]}>
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
        onReply={handleReply}
        onCopy={handleCopy}
        onEdit={isOwn ? handleEdit : undefined}
        onDelete={isOwn ? handleDelete : undefined}
        onStar={onStar ? handleStar : undefined}
        onPin={onPin ? handlePin : undefined}
        onConvertToTask={onConvertToTask ? handleConvertToTask : undefined}
        onCreateMeeting={onCreateMeeting ? handleCreateMeeting : undefined}
        isStarred={message.is_starred}
        isPinned={message.is_pinned}
        canPin={canPin}
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

// ... keep all the existing styles and add these new ones:
const styles = StyleSheet.create({
  // ... all existing styles ...
  messageContainer: {
    marginBottom: 12,
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
    backgroundColor: '#2c3e50',
    borderBottomRightRadius: 6,
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
    color: '#ffffff',
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
    bottom: -8,
    left: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15))',
      },
    }),
  },
  reactionsContainerOwn: {
    left: 'auto',
    right: 12,
  },
   editedIndicator: {
    fontSize: 10,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  attachmentsContainer: {
    marginBottom: 8,
    gap: 8,
  },
  attachmentImageWrapper: {
    width: 180,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
  },
  attachmentOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  attachmentOverlayName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  attachmentOverlayMeta: {
    fontSize: 11,
    color: '#cbd5f5',
    marginTop: 2,
  },
  attachmentFileWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  attachmentFileIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentFileIconText: {
    fontSize: 18,
  },
  attachmentFileInfo: {
    flex: 1,
  },
  attachmentFileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  attachmentFileMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  pinnedMessage: {
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
    paddingLeft: 13,
  },
  pinnedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  pinnedIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  pinnedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366F1',
  },
})