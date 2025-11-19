// screens/ChatScreen.tsx
import React, { useState, useEffect, useCallback } from 'react'
import { 
  View, 
  StyleSheet, 
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as DocumentPicker from 'expo-document-picker'
import { useAuth } from '../hooks/useAuth'
import { useChatData } from '../hooks/useChatData'
import { useRealtimeChat } from '../hooks/useRealtimeChat'
import { useTypingIndicator } from '../hooks/useTypingIndicator'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { markMessageAsRead, getReadReceiptText } from '../services/readReceiptService'
import { addReaction, removeReaction } from '../services/reactionService'
import { fetchChannelMembersList } from '../services/channelService'
import { IS_MOBILE } from '../constants/chat'
import { Channel, ChannelMember, Message, PendingAttachment, MessageAttachmentType } from '../types/chat'
import { createOrGetDirectMessageChannel } from '../services/directMessageService'
import { uploadPendingAttachments } from '../services/attachmentService'
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
  EditMessageModal,
  SearchModal,
  ConvertToTaskModal,
  MeetingInviteModal,
} from '../components/chat'
import { starMessage, unstarMessage, isMessageStarred } from '../services/messageBookmarkService'
import { pinMessage, unpinMessage, getPinnedMessage } from '../services/messagePinService'
import { TouchableOpacity, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export default function ChatScreen() {
  const { user } = useAuth()
  
  // All state declarations at the top - this is crucial!
  const [message, setMessage] = useState('')
  const [showChannelModal, setShowChannelModal] = useState(false)
  const [showMembersList, setShowMembersList] = useState(false)
  const [hasUserChecked, setHasUserChecked] = useState(false)
  const [channelMembersList, setChannelMembersList] = useState<ChannelMember[]>([])
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [showConversationList, setShowConversationList] = useState(true)
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
  const [uploadingAttachments, setUploadingAttachments] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null)
  const [canPin, setCanPin] = useState(false)
  const [showConvertToTaskModal, setShowConvertToTaskModal] = useState(false)
  const [messageToConvert, setMessageToConvert] = useState<Message | null>(null)
  const [showMeetingModal, setShowMeetingModal] = useState(false)
  const [messageForMeeting, setMessageForMeeting] = useState<Message | null>(null)

const handleReply = useCallback((message: Message) => {
    setReplyingTo(message)
  }, [])

  const getAttachmentType = useCallback((mimeType?: string, name?: string): MessageAttachmentType => {
    if (mimeType) {
      if (mimeType.startsWith('image/')) return 'image'
      if (mimeType.startsWith('video/')) return 'video'
      if (mimeType.startsWith('audio/')) return 'audio'
      if (
        mimeType === 'application/pdf' ||
        mimeType.includes('application/msword') ||
        mimeType.includes('application/vnd')
      ) {
        return 'document'
      }
    }

    const extension = name?.split('.').pop()?.toLowerCase()
    if (extension) {
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(extension)) return 'image'
      if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension)) return 'video'
      if (['mp3', 'wav', 'aac', 'm4a', 'ogg'].includes(extension)) return 'audio'
      if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt'].includes(extension)) return 'document'
    }
    return 'other'
  }, [])

  const handleAddAttachments = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      })

      if (result.canceled) return

      const assets = result.assets ?? []
      if (!assets.length) return

      setPendingAttachments(prev => {
        const existingUris = new Set(prev.map(att => att.uri))
        const newAttachments = assets
          .filter(asset => asset.uri && !existingUris.has(asset.uri))
          .map(asset => {
            const id = globalThis?.crypto?.randomUUID
              ? globalThis.crypto.randomUUID()
              : `${Date.now()}-${Math.random()}`
            const mimeType = asset.mimeType || 'application/octet-stream'
            return {
              id,
              uri: asset.uri,
              name: asset.name || 'Attachment',
              mime_type: mimeType,
              size: asset.size || undefined,
              type: getAttachmentType(mimeType, asset.name),
            } as PendingAttachment
          })

        return [...prev, ...newAttachments]
      })
    } catch (error) {
      console.error('Error picking attachments:', error)
      Alert.alert('Error', 'Failed to select files. Please try again.')
    }
  }, [getAttachmentType])

  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    setPendingAttachments(prev => prev.filter(att => att.id !== attachmentId))
  }, [])

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
    editMessage,
    refresh,
    addReactionToMessage,
    removeReactionFromMessage,
    createDirectMessage, 
  } = useChatData(user?.id)

  const handleStartDirectMessage = useCallback(async (member: ChannelMember) => {
    if (!user?.id || member.user_id === user.id) {
      console.log('Cannot start DM: same user or no user ID')
      return
    }

    try {
      console.log('Starting DM with:', member.profiles.username)
      
      // Use the new createDirectMessage function
      const dmChannel = await createDirectMessage(
        member.user_id,
        member.profiles
      )
      
      if (dmChannel) {
        console.log('DM Channel opened:', dmChannel)
        // Switch to the new DM channel and hide conversation list
        selectChannel(dmChannel)
        setShowConversationList(false)
      }
    } catch (error) {
      console.error('Error starting direct message:', error)
      Alert.alert('Error', 'Failed to start direct message. Please try again.')
    }
  }, [user?.id, createDirectMessage, selectChannel])

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
      
      // Load pinned message
      getPinnedMessage(selectedChannel.id).then(setPinnedMessage).catch(console.error)
      
      // Check if user can pin (admin or manager)
      if (user.user_metadata?.role === 'admin' || user.user_metadata?.role === 'manager') {
        setCanPin(true)
      } else {
        setCanPin(false)
      }
    }
  }, [selectedChannel?.id, user?.id, loadMessages, loadChannelMembers])

  const handleEditMessage = useCallback((message: Message) => {
    setEditingMessage(message)
  }, [])

  const handleSaveEdit = useCallback(async (messageId: string, newContent: string) => {
    try {
      await editMessage(messageId, newContent)
      setEditingMessage(null)
    } catch (error) {
      console.error('Error saving edit:', error)
      Alert.alert('Error', 'Failed to save changes')
    }
  }, [editMessage])

  // All useCallback hooks must be declared unconditionally
  const handleChannelSelect = useCallback((channel: Channel) => {
    selectChannel(channel)
    setShowConversationList(false) // Hide conversation list when channel is selected
    setShowChannelModal(false)
  }, [selectChannel])

  const handleSendMessage = useCallback(async () => {
    if (!selectedChannel || !user) return

    const trimmedMessage = message.trim()
    const hasText = trimmedMessage.length > 0
    const hasAttachments = pendingAttachments.length > 0
    if (!hasText && !hasAttachments) return

    try {
      setUploadingAttachments(hasAttachments)

      const uploadedAttachments = hasAttachments
        ? await uploadPendingAttachments(pendingAttachments, selectedChannel.id, user.id)
        : []

      await sendChatMessage(trimmedMessage, replyingTo?.id, uploadedAttachments) // Pass reply ID
      setMessage('')
      setReplyingTo(null) // Clear reply after sending
      setPendingAttachments([])
      await handleStopTyping()
    } catch (error) {
      console.error('Error sending message:', error)
      Alert.alert('Error', 'Failed to send message. Please try again.')
    } finally {
      setUploadingAttachments(false)
    }
  }, [
    message,
    selectedChannel,
    user,
    sendChatMessage,
    handleStopTyping,
    replyingTo,
    pendingAttachments,
  ])

  // Add cancel reply handler
  const handleCancelReply = useCallback(() => {
    setReplyingTo(null)
  }, [])

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

  const handleCloseEdit = useCallback(() => {
    setEditingMessage(null)
  }, [])

  const handleCloseMembers = useCallback(() => {
    setShowMembersList(false)
  }, [])

  const handleStarMessage = useCallback(async (messageId: string) => {
    if (!user?.id) return
    
    try {
      const isStarred = await isMessageStarred(messageId, user.id)
      if (isStarred) {
        await unstarMessage(messageId, user.id)
      } else {
        await starMessage(messageId, user.id)
      }
      // Refresh messages to update star status
      if (selectedChannel?.id) {
        loadMessages(selectedChannel.id)
      }
    } catch (error) {
      console.error('Error toggling star:', error)
      Alert.alert('Error', 'Failed to update star status')
    }
  }, [user?.id, selectedChannel?.id, loadMessages])

  const handlePinMessage = useCallback(async (messageId: string) => {
    if (!user?.id || !selectedChannel?.id) return
    
    try {
      const message = messages.find(m => m.id === messageId)
      if (message?.is_pinned) {
        await unpinMessage(messageId, user.id)
      } else {
        await pinMessage(messageId, selectedChannel.id, user.id)
      }
      // Refresh messages to update pin status
      loadMessages(selectedChannel.id)
      getPinnedMessage(selectedChannel.id).then(setPinnedMessage).catch(console.error)
    } catch (error) {
      console.error('Error toggling pin:', error)
      Alert.alert('Error', (error as Error).message || 'Failed to update pin status')
    }
  }, [user?.id, selectedChannel?.id, messages, loadMessages])

  const handleSearchPress = useCallback(() => {
    setShowSearchModal(true)
  }, [])

  const handleSearchMessagePress = useCallback((messageId: string) => {
    // Scroll to message when clicked from search or pinned banner
    // This will be handled by MessageList via onPinnedMessagePress
    setShowSearchModal(false)
  }, [])

  const handleConvertToTask = useCallback((message: Message) => {
    setMessageToConvert(message)
    setShowConvertToTaskModal(true)
  }, [])

  const handleCreateMeeting = useCallback((message: Message) => {
    setMessageForMeeting(message)
    setShowMeetingModal(true)
  }, [])

  // New handler for back navigation from chat to conversation list
  const handleBackToConversations = useCallback(() => {
    setShowConversationList(true)
    selectChannel(null)
  }, [selectChannel])


  // Loading state - this is a conditional return, which is allowed
  if (!hasUserChecked || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingState 
          message={!user ? 'Waiting for authentication...' : 'Loading conversations...'}
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

  // WhatsApp-like layout with conversation list
  if (IS_MOBILE) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {showConversationList ? (
            // Conversation List View (WhatsApp home screen)
            <View style={styles.conversationListContainer}>
              {/* Updated Header to match HomeScreen */}
              <View style={styles.conversationHeader}>
                <View style={styles.headerContent}>
                  <View style={styles.textContainer}>
                    <Text style={styles.title}>Chats</Text>
                    <Text style={styles.subtitle}>
                      {user?.email ? `Welcome, ${user.email.split('@')[0]}!` : 'Your conversations'}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.newChatButton}
                    onPress={() => setShowChannelModal(true)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="add-outline" size={24} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <ChannelList
                channels={channels}
                selectedChannelId={selectedChannel?.id}
                onChannelSelect={handleChannelSelect}
                refreshing={refreshing}
                onRefresh={refresh}
              />
            </View>
          ) : (
            // Individual Chat View
            <>
              <ChatHeader
                channelName={selectedChannel?.type === 'direct' && selectedChannel?.dm_user
                  ? selectedChannel.dm_user.full_name || selectedChannel.dm_user.username
                  : selectedChannel?.name}
                unreadCount={getTotalUnreadCount()}
                onChannelPress={handleBackToConversations}
                onMembersPress={selectedChannel?.type !== 'direct' ? handleMembersPress : undefined}
                onSearchPress={handleSearchPress}
                memberCount={selectedChannel?.type !== 'direct' ? channelMembersList.length : 0}
                isDM={selectedChannel?.type === 'direct'}
                dmUser={selectedChannel?.dm_user}
                showBackButton={true}
                onBackPress={handleBackToConversations}
              />

              {showMembersList ? (
                <MembersList
                  members={channelMembersList}
                  isVisible={showMembersList}
                  onClose={handleCloseMembers}
                  currentUserId={user?.id}
                  onStartDirectMessage={handleStartDirectMessage}
                />
              ) : selectedChannel ? (
                <>
                  <MessageList
                    messages={messages}
                    currentUserId={user.id}
                    channelMembers={channelMembers}
                    channelName={
                      selectedChannel.type === 'direct' && selectedChannel.dm_user
                        ? `${selectedChannel.dm_user.full_name || selectedChannel.dm_user.username}`
                        : selectedChannel.name
                    }
                    channelId={selectedChannel.id}
                    refreshing={refreshing}
                    onRefresh={refresh}
                    onDeleteMessage={handleDeleteMessage}
                    onEditMessage={handleEditMessage}
                    onReaction={handleReaction}
                    onReply={handleReply}
                    getReadReceiptText={getMessageReadReceiptText}
                    onStar={handleStarMessage}
                    onPin={handlePinMessage}
                    onConvertToTask={handleConvertToTask}
                    onCreateMeeting={handleCreateMeeting}
                    canPin={canPin}
                    pinnedMessage={pinnedMessage}
                    onPinnedMessagePress={handleSearchMessagePress}
                  />

                  <TypingIndicator typingUsers={typingUsers} />
                  
                  <MessageInput
                    value={message}
                    onChangeText={setMessage}
                    onSend={handleSendMessage}
                    placeholder={
                      selectedChannel?.type === 'direct' && selectedChannel?.dm_user
                        ? `Message ${selectedChannel.dm_user.full_name || selectedChannel.dm_user.username}`
                        : `Message #${selectedChannel?.name || 'channel'}`
                    }
                    sending={sending}
                    onTyping={handleTyping}
                    replyingTo={replyingTo}
                    onCancelReply={handleCancelReply}
                    channelMembers={channelMembers}
                    attachments={pendingAttachments}
                    onAttachPress={handleAddAttachments}
                    onRemoveAttachment={handleRemoveAttachment}
                    uploadingAttachments={uploadingAttachments}
                  />
                </>
              ) : (
                <EmptyState onSelectChannel={() => setShowChannelModal(true)} />
              )}

              <EditMessageModal
                visible={!!editingMessage}
                message={editingMessage}
                onClose={handleCloseEdit}
                onSave={handleSaveEdit}
              />

              <SearchModal
                visible={showSearchModal}
                onClose={() => setShowSearchModal(false)}
                channelId={selectedChannel?.id}
                userId={user.id}
                onMessagePress={handleSearchMessagePress}
              />

              <ConvertToTaskModal
                visible={showConvertToTaskModal}
                message={messageToConvert}
                currentUserId={user.id}
                channelMembers={channelMembers}
                onClose={() => {
                  setShowConvertToTaskModal(false)
                  setMessageToConvert(null)
                }}
                onSuccess={() => {
                  // Optionally refresh tasks or show notification
                }}
              />

              <MeetingInviteModal
                visible={showMeetingModal}
                message={messageForMeeting}
                currentUserId={user.id}
                channelMembers={channelMembers}
                channelId={selectedChannel?.id}
                onClose={() => {
                  setShowMeetingModal(false)
                  setMessageForMeeting(null)
                }}
                onSuccess={() => {
                  // Optionally refresh calendar or show notification
                }}
              />
            </>
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

  // Desktop layout - modified for WhatsApp-like experience
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.content}>
        {/* Conversation List Sidebar */}
        <View style={styles.conversationSidebar}>
          {/* Updated Header to match HomeScreen */}
          <View style={styles.sidebarHeader}>
            <View style={styles.headerContent}>
              <View style={styles.textContainer}>
                <Text style={styles.title}>Chats</Text>
                <Text style={styles.subtitle}>
                  {user?.email ? `Welcome, ${user.email.split('@')[0]}!` : 'Your conversations'}
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.newChatButton}
                onPress={() => setShowChannelModal(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="add-outline" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
          
          <ChannelList
            channels={channels}
            selectedChannelId={selectedChannel?.id}
            onChannelSelect={handleChannelSelect}
            refreshing={refreshing}
            onRefresh={refresh}
          />
        </View>

        {/* Chat Area */}
        <View style={styles.chatArea}>
          {selectedChannel ? (
            <>
              <ChatAreaHeader   
                channelName={selectedChannel.name}
                onBack={handleBackToConversations}
                showBackButton={true}
                onMembersPress={selectedChannel?.type !== 'direct' ? handleMembersPress : undefined}
                onSearchPress={handleSearchPress}
                memberCount={selectedChannel?.type !== 'direct' ? channelMembersList.length : 0}
                isDM={selectedChannel?.type === 'direct'}
                dmUser={selectedChannel?.dm_user}
              />

              <MessageList
                messages={messages}
                currentUserId={user.id}
                channelMembers={channelMembers}
                channelName={
                  selectedChannel.type === 'direct' && selectedChannel.dm_user
                    ? `${selectedChannel.dm_user.full_name || selectedChannel.dm_user.username}`
                    : selectedChannel.name
                }
                channelId={selectedChannel.id}
                refreshing={refreshing}
                onRefresh={refresh}
                onDeleteMessage={handleDeleteMessage}
                onEditMessage={handleEditMessage}
                onReaction={handleReaction}
                onReply={handleReply}
                getReadReceiptText={getMessageReadReceiptText}
                onStar={handleStarMessage}
                onPin={handlePinMessage}
                onConvertToTask={handleConvertToTask}
                onCreateMeeting={handleCreateMeeting}
                canPin={canPin}
                pinnedMessage={pinnedMessage}
                onPinnedMessagePress={handleSearchMessagePress}
              />

              <TypingIndicator typingUsers={typingUsers} />

              <MessageInput
                value={message}
                onChangeText={setMessage}
                onSend={handleSendMessage}
                placeholder={
                  selectedChannel?.type === 'direct' && selectedChannel?.dm_user
                    ? `Message ${selectedChannel.dm_user.full_name || selectedChannel.dm_user.username}`
                    : `Message #${selectedChannel?.name || 'channel'}`
                }
                sending={sending}
                onTyping={handleTyping}
                channelMembers={channelMembers}
                attachments={pendingAttachments}
                onAttachPress={handleAddAttachments}
                onRemoveAttachment={handleRemoveAttachment}
                uploadingAttachments={uploadingAttachments}
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
            onStartDirectMessage={handleStartDirectMessage}
          />
        )}
      </View>

      <ChannelModal
        visible={showChannelModal}
        channels={channels}
        selectedChannelId={selectedChannel?.id}
        onClose={() => setShowChannelModal(false)}
        onSelectChannel={handleChannelSelect}
      />
      
      <EditMessageModal
        visible={!!editingMessage}
        message={editingMessage}
        onClose={handleCloseEdit}
        onSave={handleSaveEdit}
      />

      <SearchModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        channelId={selectedChannel?.id}
        userId={user?.id || ''}
        onMessagePress={handleSearchMessagePress}
      />

      <ConvertToTaskModal
        visible={showConvertToTaskModal}
        message={messageToConvert}
        currentUserId={user?.id || ''}
        channelMembers={channelMembers}
        onClose={() => {
          setShowConvertToTaskModal(false)
          setMessageToConvert(null)
        }}
        onSuccess={() => {
          // Optionally refresh tasks or show notification
        }}
      />

      <MeetingInviteModal
        visible={showMeetingModal}
        message={messageForMeeting}
        currentUserId={user?.id || ''}
        channelMembers={channelMembers}
        channelId={selectedChannel?.id}
        onClose={() => {
          setShowMeetingModal(false)
          setMessageForMeeting(null)
        }}
        onSuccess={() => {
          // Optionally refresh calendar or show notification
        }}
      />
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
  conversationListContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  conversationHeader: {
    backgroundColor: '#6366F1',
    borderBottomEndRadius: 16,
    borderBottomStartRadius: 16,
    paddingBottom: 12,
  },
  sidebarHeader: {
    backgroundColor: '#6366F1',
    borderBottomEndRadius: 16,
    borderBottomStartRadius: 16,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  newChatButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  conversationSidebar: {
    width: 350,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
})