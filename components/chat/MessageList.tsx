// components/chat/MessageList.tsx
import React, { useRef, useEffect, useState } from 'react'
import { FlatList, View, Text, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native'
import { Message } from '../../types/chat'
import { MessageBubble } from './MessageBubble'
import { UnreadSeparator } from './UnreadSeparator'
import { PinnedMessageBanner } from './PinnedMessageBanner'
import { IS_MOBILE } from '../../constants/chat'
import { shouldShowDateHeader, formatDateHeader } from '../../utils/chatHelpers'
import { getLastReadTimestamp, isMessageUnread } from '../../services/unreadSeparatorService'

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  channelMembers: Map<string, any>
  channelName: string
  channelId: string
  refreshing: boolean
  onRefresh: () => void
  onDeleteMessage: (messageId: string, isOwn: boolean) => void
  onEditMessage?: (message: Message) => void
  onReaction: (messageId: string, emoji: string) => void
  onReply?: (message: Message) => void
  getReadReceiptText: (message: Message) => string
  onStar?: (messageId: string) => void
  onPin?: (messageId: string) => void
  onConvertToTask?: (message: Message) => void
  onCreateMeeting?: (message: Message) => void
  canPin?: boolean
  pinnedMessage?: Message | null
  onPinnedMessagePress?: (messageId: string) => void
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  channelMembers,
  channelName,
  channelId,
  refreshing,
  onRefresh,
  onDeleteMessage,
  onEditMessage,
  onReaction,
  onReply,
  getReadReceiptText,
  onStar,
  onPin,
  onConvertToTask,
  onCreateMeeting,
  canPin,
  pinnedMessage,
  onPinnedMessagePress,
}) => {
  const flatListRef = useRef<FlatList>(null)
  const prevMessageCountRef = useRef(messages.length)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [hasNewMessages, setHasNewMessages] = useState(false)
  const [lastReadTimestamp, setLastReadTimestamp] = useState<string | null>(null)
  const [unreadMessageIndex, setUnreadMessageIndex] = useState<number | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      if (isAtBottom) {
        requestAnimationFrame(() => {
          flatListRef.current?.scrollToEnd({ animated: true })
        })
      } else {
        setHasNewMessages(true)
        setShowScrollToBottom(true)
      }
    }
    prevMessageCountRef.current = messages.length
  }, [messages.length, isAtBottom])

  // Load last read timestamp and determine unread separator position
  useEffect(() => {
    const loadUnreadSeparator = async () => {
      if (!channelId || !currentUserId) return

      const timestamp = await getLastReadTimestamp(currentUserId, channelId)
      setLastReadTimestamp(timestamp)

      if (timestamp && messages.length > 0) {
        // Find first unread message
        let unreadIndex = -1
        let count = 0
        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i]
          const msgDate = new Date(msg.created_at)
          const readDate = new Date(timestamp)
          
          if (msgDate > readDate && msg.user_id !== currentUserId) {
            if (unreadIndex === -1) unreadIndex = i
            count++
          }
        }
        setUnreadMessageIndex(unreadIndex >= 0 ? unreadIndex : null)
        setUnreadCount(count)
      } else {
        setUnreadMessageIndex(null)
        setUnreadCount(0)
      }
    }

    loadUnreadSeparator()
  }, [channelId, currentUserId, messages])

  const isOwnMessage = (messageUserId: string) => messageUserId === currentUserId

  const handleDelete = (messageId: string) => {
    onDeleteMessage(messageId, true)
  }

  const handleEdit = (message: Message) => {
    if (onEditMessage) {
      onEditMessage(message)
    }
  }

  const scrollToMessage = (messageId: string) => {
    const index = messages.findIndex(m => m.id === messageId)
    if (index !== -1) {
      // Use a small delay to ensure the list is rendered
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 })
      }, 100)
    }
  }

  const handleScroll = (event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent
    const threshold = 80
    const isNearBottom =
      contentOffset.y + layoutMeasurement.height >= contentSize.height - threshold

    setIsAtBottom(isNearBottom)
    if (isNearBottom) {
      setShowScrollToBottom(false)
      setHasNewMessages(false)
    }
  }

  const handleContentSizeChange = () => {
    if (isAtBottom) {
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      })
    }
  }

  const handleScrollToBottomPress = () => {
    flatListRef.current?.scrollToEnd({ animated: true })
    setShowScrollToBottom(false)
    setHasNewMessages(false)
  }

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const previousMessage = index > 0 ? messages[index - 1] : null
    const showDateHeader = shouldShowDateHeader(item, previousMessage)
    const showUnreadSeparator = unreadMessageIndex === index

    return (
      <View>
        {showDateHeader && (
          <View style={styles.dateHeader}>
            <Text style={styles.dateHeaderText}>
              {formatDateHeader(item.created_at)}
            </Text>
          </View>
        )}
        {showUnreadSeparator && (
          <UnreadSeparator unreadCount={unreadCount} />
        )}
        <MessageBubble
          message={item}
          isOwn={isOwnMessage(item.user_id)}
          onLongPress={() => onDeleteMessage(item.id, isOwnMessage(item.user_id))}
          onReaction={onReaction}
          onDelete={handleDelete}
          onEdit={() => handleEdit(item)}
          onReply={onReply}
          onReplyPress={scrollToMessage}
          readReceiptText={getReadReceiptText(item)}
          showReadReceipt={!item.id.startsWith('temp-')}
          currentUserId={currentUserId}
          onStar={onStar}
          onPin={onPin}
          onConvertToTask={onConvertToTask}
          onCreateMeeting={onCreateMeeting}
          canPin={canPin}
        />
      </View>
    )
  }

  const handlePinnedMessagePress = () => {
    if (pinnedMessage) {
      // Scroll to the pinned message in the list
      scrollToMessage(pinnedMessage.id)
      // Also notify parent if handler provided
      if (onPinnedMessagePress) {
        onPinnedMessagePress(pinnedMessage.id)
      }
    }
  }

  return (
    <View style={styles.listWrapper}>
      {pinnedMessage && (
        <PinnedMessageBanner
          pinnedMessage={pinnedMessage}
          onPress={handlePinnedMessagePress}
        />
      )}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={IS_MOBILE ? styles.messagesContainerMobile : styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#6366F1"
          />
        }
        renderItem={renderItem}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={handleContentSizeChange}
        onScrollToIndexFailed={(info) => {
          const wait = new Promise(resolve => setTimeout(resolve, 500))
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true })
          })
        }}
        ListEmptyComponent={
          <View style={styles.emptyMessages}>
            <Text style={styles.emptyMessageEmoji}>💬</Text>
            <Text style={styles.emptyMessageText}>No messages yet</Text>
            <Text style={styles.emptyMessageSubtext}>
              Be the first to start the conversation in #{channelName}!
            </Text>
          </View>
        }
      />

      {showScrollToBottom && (
        <TouchableOpacity style={styles.scrollButton} onPress={handleScrollToBottomPress} activeOpacity={0.85}>
          <Text style={styles.scrollButtonArrow}>↓</Text>
          <Text style={styles.scrollButtonText}>
            {hasNewMessages ? 'New messages' : 'Scroll to bottom'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  listWrapper: {
    flex: 1,
    position: 'relative',
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  messagesContainer: {
    padding: 20,
    paddingBottom: 10,
    flexGrow: 1,
  },
  messagesContainerMobile: {
    padding: 16,
    paddingBottom: 10,
    flexGrow: 1,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeaderText: {
    fontSize: 12,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    fontWeight: '600',
  },
  emptyMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyMessageEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyMessageText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '600',
  },
  emptyMessageSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  scrollButton: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  scrollButtonArrow: {
    fontSize: 16,
    color: '#f8fafc',
  },
  scrollButtonText: {
    fontSize: 13,
    color: '#f8fafc',
    fontWeight: '600',
  },
})