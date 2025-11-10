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
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { markMessageAsRead, getReadReceiptText } from '../services/readReceiptService'
import { addReaction, removeReaction } from '../services/reactionService'
import { fetchChannelMembersList } from '../services/channelService'
import { IS_MOBILE } from '../constants/chat'
import { Channel, ChannelMember } from '../types/chat'
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
  MembersList,
} from '../components/chat'

export default function ChatScreen() {
  const { user } = useAuth()
  
  // All state declarations at the top - this is crucial!
  const [message, setMessage] = useState('')
  const [showChannelModal, setShowChannelModal] = useState(false)
  const [showMembersList, setShowMembersList] = useState(false)
  const [hasUserChecked, setHasUserChecked] = useState(false)
  const [channelMembersList, setChannelMembersList] = useState<ChannelMember[]>([])

  // All hooks must be called unconditionally and in the same order every render
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
    addReactionToMessage,
    removeReactionFromMessage,
  } = useChatData(user?.id)

  const { typingUsers, handleTyping, handleStopTyping } = useTypingIndicator({
    channelId: selectedChannel?.id,
    userId: user?.id,
    channelMembers,
  })

  // This hook must always be called, regardless of conditions
  useOnlineStatus(user?.id, selectedChannel?.id)

  // Load detailed members list when channel changes
  useEffect(() => {
    const loadMembersList = async () => {
      if (selectedChannel?.id) {
        try {
          const members = await fetchChannelMembersList(selectedChannel.id)
          setChannelMembersList(members)
        } catch (error) {
          console.error('Error loading members list:', error)
        }
      } else {
        // Clear members list when no channel is selected
        setChannelMembersList([])
      }
    }

    loadMembersList()
  }, [selectedChannel?.id])

  // Realtime subscriptions - must be unconditional
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
    onReactionAdded: useCallback((reaction) => {
      if (addReactionToMessage) {
        addReactionToMessage(reaction)
      } else {
        // Fallback using updateMessage
        updateMessage(reaction.message_id, (prevMessage) => {
          const currentReactions = prevMessage.reactions || []
          const exists = currentReactions.some(r => r.id === reaction.id)
          if (!exists) {
            return {
              reactions: [...currentReactions, reaction]
            }
          }
          return {}
        })
      }
    }, [addReactionToMessage, updateMessage]),
    onReactionRemoved: useCallback((reactionId, messageId) => {
      if (removeReactionFromMessage) {
        removeReactionFromMessage(reactionId, messageId)
      } else {
        // Fallback using updateMessage
        updateMessage(messageId, (prevMessage) => {
          const currentReactions = prevMessage.reactions || []
          return {
            reactions: currentReactions.filter(r => r.id !== reactionId)
          }
        })
      }
    }, [removeReactionFromMessage, updateMessage]),
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

  // All useCallback hooks must be declared unconditionally
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

  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user?.id) return

    try {
      const message = messages.find(m => m.id === messageId)
      const existingReaction = message?.reactions?.find(
        r => r.emoji === emoji && r.user_id === user.id
      )

      if (existingReaction) {
        await removeReaction(existingReaction.id)
      } else {
        await addReaction(messageId, emoji, user.id)
      }
    } catch (error) {
      console.error('Error handling reaction:', error)
      Alert.alert('Error', 'Failed to update reaction')
    }
  }, [user?.id, messages])

  const getTotalUnreadCount = useCallback(() => {
    return channels.reduce((sum, channel) => sum + channel.unread_count, 0)
  }, [channels])

  const getMessageReadReceiptText = useCallback((msg: typeof messages[0]) => {
    if (!user?.id) return 'Sent'
    return getReadReceiptText(msg, user.id, channelMembers)
  }, [user?.id, channelMembers])

  const handleMembersPress = useCallback(() => {
    setShowMembersList(true)
  }, [])

  const handleCloseMembers = useCallback(() => {
    setShowMembersList(false)
  }, [])

  // Loading state - this is a conditional return, which is allowed
  if (!hasUserChecked || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingState 
          message={!user ? 'Waiting for authentication...' : 'Loading channels...'}
        />
      </SafeAreaView>
    )
  }

  // Not authenticated - conditional return
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingState message="Please log in to access chat" />
      </SafeAreaView>
    )
  }

  // The rest of your component rendering...
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
            onMembersPress={handleMembersPress}
            memberCount={channelMembersList.length}
          />

          {showMembersList ? (
            <MembersList
              members={channelMembersList}
              isVisible={showMembersList}
              onClose={handleCloseMembers}
              currentUserId={user?.id}
            />
          ) : selectedChannel ? (
            <>
              <MessageList
                messages={messages}
                currentUserId={user.id}
                channelMembers={channelMembers}
                channelName={selectedChannel.name}
                refreshing={refreshing}
                onRefresh={refresh}
                onDeleteMessage={handleDeleteMessage}
                onReaction={handleReaction}
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

  // Desktop layout
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
        onMembersPress={handleMembersPress}
        memberCount={channelMembersList.length}
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
                onMembersPress={handleMembersPress}
                memberCount={channelMembersList.length}
              />

              <MessageList
                messages={messages}
                currentUserId={user.id}
                channelMembers={channelMembers}
                channelName={selectedChannel.name}
                refreshing={refreshing}
                onRefresh={refresh}
                onDeleteMessage={handleDeleteMessage}
                onReaction={handleReaction}
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

        {/* Members List Sidebar for Desktop */}
        {showMembersList && (
          <MembersList
            members={channelMembersList}
            isVisible={showMembersList}
            onClose={handleCloseMembers}
            currentUserId={user?.id}
          />
        )}
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