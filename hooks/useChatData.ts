// hooks/useChatData.ts
import { useState, useCallback, useRef } from 'react'
import { Alert } from 'react-native'
import { Channel, Message, ChatState } from '../types/chat'
import { 
  fetchChannels, 
  fetchChannelUnreadCounts,
  addUserToDefaultChannels,
  fetchChannelMembers
} from '../services/channelService'
import { fetchMessages, sendMessage as sendMessageAPI, deleteMessage as deleteMessageAPI } from '../services/messageService'
import { markMessagesAsRead } from '../services/readReceiptService'
import { sanitizeMessage } from '../utils/chatHelpers'

export const useChatData = (userId: string | undefined) => {
  const [state, setState] = useState<ChatState>({
    channels: [],
    selectedChannel: null,
    messages: [],
    channelMembers: new Map(),
    typingUsers: [],
    loading: true,
    sending: false,
    refreshing: false
  })

  const fetchingRef = useRef(false)

  const loadChannels = useCallback(async () => {
    if (!userId || fetchingRef.current) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    try {
      fetchingRef.current = true
      setState(prev => ({ ...prev, loading: true }))
      
      let channelsData = await fetchChannels(userId)
      
      if (channelsData.length === 0) {
        await addUserToDefaultChannels(userId)
        channelsData = await fetchChannels(userId)
      }

      const channelIds = channelsData.map(ch => ch.id)
      const unreadCounts = await fetchChannelUnreadCounts(userId, channelIds)

      const channelsWithUnread = channelsData.map(channel => ({
        ...channel,
        unread_count: unreadCounts[channel.id] || 0
      }))

      setState(prev => ({
        ...prev,
        channels: channelsWithUnread,
        selectedChannel: channelsWithUnread.length > 0 && !prev.selectedChannel 
          ? channelsWithUnread[0] 
          : prev.selectedChannel
      }))
    } catch (error) {
      console.error('Error fetching channels:', error)
      Alert.alert('Error', 'Failed to load channels. Please try again.')
    } finally {
      setState(prev => ({ ...prev, loading: false }))
      fetchingRef.current = false
    }
  }, [userId])

  const loadMessages = useCallback(async (channelId: string) => {
    if (!userId) return

    try {
      const messagesData = await fetchMessages(channelId)
      setState(prev => ({ ...prev, messages: messagesData }))
      await markMessagesAsRead(channelId, userId)
    } catch (error) {
      console.error('Error fetching messages:', error)
      Alert.alert('Error', 'Failed to load messages')
    }
  }, [userId])

  const loadChannelMembers = useCallback(async (channelId: string) => {
    try {
      const members = await fetchChannelMembers(channelId)
      setState(prev => ({ ...prev, channelMembers: members }))
    } catch (error) {
      console.error('Error fetching channel members:', error)
    }
  }, [])

  const selectChannel = useCallback((channel: Channel) => {
    setState(prev => ({
      ...prev,
      selectedChannel: channel,
      channels: prev.channels.map(ch => 
        ch.id === channel.id ? { ...ch, unread_count: 0 } : ch
      )
    }))
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    if (!userId || !state.selectedChannel) return null

    const sanitized = sanitizeMessage(content)
    if (!sanitized) return null

    // Create optimistic message
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content: sanitized,
      channel_id: state.selectedChannel.id,
      user_id: userId,
      created_at: new Date().toISOString(),
      profiles: {
        id: userId,
        username: 'You',
        full_name: 'You',
      },
      read_by: [],
      read_count: 0
    }

    setState(prev => ({ 
      ...prev, 
      messages: [...prev.messages, optimisticMessage],
      sending: true 
    }))

    try {
      const sentMessage = await sendMessageAPI(sanitized, state.selectedChannel.id, userId)
      
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg => 
          msg.id === optimisticMessage.id ? sentMessage : msg
        ),
        sending: false
      }))

      return sentMessage
    } catch (error) {
      setState(prev => ({
        ...prev,
        messages: prev.messages.filter(msg => msg.id !== optimisticMessage.id),
        sending: false
      }))
      throw error
    }
  }, [userId, state.selectedChannel])

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!userId) return

    try {
      await deleteMessageAPI(messageId, userId)
      setState(prev => ({
        ...prev,
        messages: prev.messages.filter(msg => msg.id !== messageId)
      }))
    } catch (error) {
      console.error('Error deleting message:', error)
      Alert.alert('Error', 'Failed to delete message')
    }
  }, [userId])

  const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    }))
  }, [])

  const addMessage = useCallback((message: Message) => {
    setState(prev => {
      const exists = prev.messages.some(msg => msg.id === message.id)
      if (exists) return prev
      
      return {
        ...prev,
        messages: [...prev.messages, message]
      }
    })
  }, [])

  const setTypingUsers = useCallback((users: any[]) => {
    setState(prev => ({ ...prev, typingUsers: users }))
  }, [])

  const updateChannelUnreadCount = useCallback((channelId: string, count: number) => {
    setState(prev => ({
      ...prev,
      channels: prev.channels.map(ch =>
        ch.id === channelId ? { ...ch, unread_count: count } : ch
      )
    }))
  }, [])

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, refreshing: true }))
    await loadChannels()
    if (state.selectedChannel) {
      await loadMessages(state.selectedChannel.id)
    }
    setState(prev => ({ ...prev, refreshing: false }))
  }, [loadChannels, loadMessages, state.selectedChannel])

  return {
    ...state,
    loadChannels,
    loadMessages,
    loadChannelMembers,
    selectChannel,
    sendMessage,
    deleteMessage,
    updateMessage,
    addMessage,
    setTypingUsers,
    updateChannelUnreadCount,
    refresh,
  }
}