// screens/ChatScreen.tsx
import React, { useState, useEffect, useCallback } from 'react'
import { 
  View, 
  StyleSheet, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { useChatData } from '../hooks/useChatData'
import { useRealtimeChat } from '../hooks/useRealtimeChat'
import { useTypingIndicator } from '../hooks/useTypingIndicator'
import { markMessageAsRead, getReadReceiptText } from '../services/readReceiptService'
import { IS_MOBILE } from '../constants/chat'
import { Channel } from '../types/chat'
import {
  ChatHeader,
  ChannelList,
  MessageList,
  MessageInput,
  TypingIndicator,
  ChannelModal,
  EmptyState,
    ChatAreaHeader,
  LoadingState,
} from '../components/chat'

export default function ChatScreen() {
  const { user } = useAuth()
  const [message, setMessage] = useState('')
  const [showChannelModal, setShowChannelModal] = useState(false)
  const [hasUserChecked, setHasUserChecked] = useState(false)

  const {
    channels,
    selectedChannel,
    messages,
    channelMembers,
    loading,
    sending,
    refreshing,
    loadChannels,
    loadMessages,
    loadChannelMembers,
    selectChannel,
    sendMessage: sendChatMessage,
    deleteMessage,
    updateMessage,
    addMessage,
    updateChannelUnreadCount,
    refresh,
  } = useChatData(user?.id)

  const { typingUsers, handleTyping, handleStopTyping } = useTypingIndicator({
    channelId: selectedChannel?.id,
    userId: user?.id,
    channelMembers,
  })

  // Realtime subscriptions
  useRealtimeChat({
    channelId: selectedChannel?.id,
    userId: user?.id,
    onNewMessage: useCallback(async (newMessage) => {
      addMessage(newMessage)
      
      if (newMessage.user_id !== user?.id) {
        await markMessageAsRead(newMessage.id, user?.id || '')
      }
    }, [addMessage, user?.id]),
    onDeleteMessage: useCallback((messageId) => {
      deleteMessage(messageId)
    }, [deleteMessage]),
    onMessageRead: useCallback((messageId, readUserId) => {
      updateMessage(messageId, (prevMessage) => {
        const currentReadBy = prevMessage.read_by || []
        if (!currentReadBy.includes(readUserId)) {
          return {
            read_by: [...currentReadBy, readUserId],
            read_count: (prevMessage.read_count || 0) + 1
          }
        }
        return {}
      })
    }, [updateMessage]),
  })

  useEffect(() => {
    if (user?.id) {
      setHasUserChecked(true)
      loadChannels()
    }
  }, [user?.id, loadChannels])

  useEffect(() => {
    if (selectedChannel?.id && user?.id) {
      loadMessages(selectedChannel.id)
      loadChannelMembers(selectedChannel.id)
    }
  }, [selectedChannel?.id, user?.id, loadMessages, loadChannelMembers])

  const handleChannelSelect = useCallback((channel: Channel) => {
    selectChannel(channel)
    setShowChannelModal(false)
  }, [selectChannel])

  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || !selectedChannel || !user) return

    try {
      await sendChatMessage(message)
      setMessage('')
      await handleStopTyping()
    } catch (error) {
      console.error('Error sending message:', error)
      Alert.alert('Error', 'Failed to send message. Please try again.')
    }
  }, [message, selectedChannel, user, sendChatMessage, handleStopTyping])

  const handleDeleteMessage = useCallback((messageId: string, isOwn: boolean) => {
    if (!isOwn) return

    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          onPress: () => deleteMessage(messageId), 
          style: 'destructive' 
        }
      ]
    )
  }, [deleteMessage])

  const getTotalUnreadCount = useCallback(() => {
    return channels.reduce((sum, channel) => sum + channel.unread_count, 0)
  }, [channels])

  const getMessageReadReceiptText = useCallback((msg: typeof messages[0]) => {
    if (!user?.id) return 'Sent'
    return getReadReceiptText(msg, user.id, channelMembers)
  }, [user?.id, channelMembers])

  // Loading state
  if (!hasUserChecked || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingState 
          message={!user ? 'Waiting for authentication...' : 'Loading channels...'}
        />
      </SafeAreaView>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingState message="Please log in to access chat" />
      </SafeAreaView>
    )
  }

  // Mobile Layout
  if (IS_MOBILE) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ChatHeader
            channelName={selectedChannel?.name}
            unreadCount={getTotalUnreadCount()}
            onChannelPress={() => setShowChannelModal(true)}
          />

          {selectedChannel ? (
            <>
              <MessageList
                messages={messages}
                currentUserId={user.id}
                channelMembers={channelMembers}
                channelName={selectedChannel.name}
                refreshing={refreshing}
                onRefresh={refresh}
                onDeleteMessage={handleDeleteMessage}
                getReadReceiptText={getMessageReadReceiptText}
              />
              
              <TypingIndicator typingUsers={typingUsers} />

              <MessageInput
                value={message}
                onChangeText={setMessage}
                onSend={handleSendMessage}
                placeholder={`Message #${selectedChannel.name}`}
                sending={sending}
                onTyping={handleTyping}
              />
            </>
          ) : (
            <EmptyState onSelectChannel={() => setShowChannelModal(true)} />
          )}

          <ChannelModal
            visible={showChannelModal}
            channels={channels}
            selectedChannelId={selectedChannel?.id}
            onClose={() => setShowChannelModal(false)}
            onSelectChannel={handleChannelSelect}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  // Desktop/Tablet Layout
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ChatHeader
        channelName={selectedChannel?.name}
        unreadCount={0}
        onChannelPress={() => {}}
      />

      <View style={styles.content}>
        <ChannelList
          channels={channels}
          selectedChannelId={selectedChannel?.id}
          onChannelSelect={handleChannelSelect}
          refreshing={refreshing}
          onRefresh={refresh}
        />

        <View style={styles.chatArea}>
          {selectedChannel ? (
            <>
              <ChatAreaHeader
                channelName={selectedChannel.name}
                channelDescription={selectedChannel.description}
              />

              <MessageList
                messages={messages}
                currentUserId={user.id}
                channelMembers={channelMembers}
                channelName={selectedChannel.name}
                refreshing={refreshing}
                onRefresh={refresh}
                onDeleteMessage={handleDeleteMessage}
                getReadReceiptText={getMessageReadReceiptText}
              />

              <TypingIndicator typingUsers={typingUsers} />

              <MessageInput
                value={message}
                onChangeText={setMessage}
                onSend={handleSendMessage}
                placeholder={`Message #${selectedChannel.name}`}
                sending={sending}
                onTyping={handleTyping}
              />
            </>
          ) : (
            <EmptyState />
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
})