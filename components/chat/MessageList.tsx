// components/chat/MessageList.tsx
import React, { useRef, useEffect } from 'react'
import { FlatList, View, Text, StyleSheet, RefreshControl } from 'react-native'
import { Message } from '../../types/chat'
import { MessageBubble } from './MessageBubble'
import { IS_MOBILE } from '../../constants/chat'
import { shouldShowDateHeader, formatDateHeader } from '../../utils/chatHelpers'

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  channelMembers: Map<string, any>
  channelName: string
  refreshing: boolean
  onRefresh: () => void
  onDeleteMessage: (messageId: string, isOwn: boolean) => void
  onReaction: (messageId: string, emoji: string) => void
  getReadReceiptText: (message: Message) => string
}


export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  channelMembers,
  channelName,
  refreshing,
  onRefresh,
  onDeleteMessage,
  onReaction,
  getReadReceiptText
}) => {
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false })
      }, 100)
    }
  }, [messages.length])

  const isOwnMessage = (messageUserId: string) => messageUserId === currentUserId

const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const previousMessage = index > 0 ? messages[index - 1] : null
    const showDateHeader = shouldShowDateHeader(item, previousMessage)

    return (
      <View>
        {showDateHeader && (
          <View style={styles.dateHeader}>
            <Text style={styles.dateHeaderText}>
              {formatDateHeader(item.created_at)}
            </Text>
          </View>
        )}
        <MessageBubble
          message={item}
          isOwn={isOwnMessage(item.user_id)}
          onLongPress={() => onDeleteMessage(item.id, isOwnMessage(item.user_id))}
          onReaction={onReaction}
          readReceiptText={getReadReceiptText(item)}
          showReadReceipt={!item.id.startsWith('temp-')}
          currentUserId={currentUserId}
        />
      </View>
    )
  }
  return (
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
  )
}

const styles = StyleSheet.create({
  messagesList: {
    flex: 1,
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
})