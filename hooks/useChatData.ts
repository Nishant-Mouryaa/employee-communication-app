// hooks/useChatData.ts
import { useState, useCallback, useRef } from 'react'
import { Alert } from 'react-native'
import { Channel, Message, ChatState, Reaction } from '../types/chat'
import { 
  fetchChannels, 
  fetchChannelUnreadCounts,
  addUserToDefaultChannels,
  fetchChannelMembers
} from '../services/channelService'
import { 
  fetchDirectMessageChannels,
  createOrGetDirectMessageChannel 
} from '../services/directMessageService' // Add this import
import { fetchMessages, sendMessage as sendMessageAPI, deleteMessage as deleteMessageAPI } from '../services/messageService'
import { markMessagesAsRead } from '../services/readReceiptService'
import { sanitizeMessage } from '../utils/chatHelpers'
import { updateMessage as updateMessageAPI } from '../services/messageService'

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
    
    // Fetch regular channels
    let channelsData = await fetchChannels(userId)
    
    if (channelsData.length === 0) {
      await addUserToDefaultChannels(userId)
      channelsData = await fetchChannels(userId)
    }

    // Fetch DM channels
    const dmChannels = await fetchDirectMessageChannels(userId)
    
    // Combine channels
    const allChannels = [...channelsData, ...dmChannels]
    
    // Remove duplicates by ID
    const uniqueChannels = Array.from(
      new Map(allChannels.map(ch => [ch.id, ch])).values()
    )

    const channelIds = uniqueChannels.map(ch => ch.id)
    const unreadCounts = await fetchChannelUnreadCounts(userId, channelIds)

    const channelsWithUnread = uniqueChannels.map(channel => ({
      ...channel,
      unread_count: unreadCounts[channel.id] || 0
    }))

    setState(prev => ({
      ...prev,
      channels: channelsWithUnread,
      selectedChannel: channelsWithUnread.length > 0 && !prev.selectedChannel 
        ? channelsWithUnread.find(ch => ch.type !== 'direct') || channelsWithUnread[0]
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

  const selectChannel = useCallback((channel: Channel | null) => {
    if (!channel) {
      setState(prev => ({
        ...prev,
        selectedChannel: null,
        messages: [],
        channelMembers: new Map()
      }))
      return
    }

    setState(prev => ({
      ...prev,
      selectedChannel: channel,
      channels: prev.channels.map(ch => 
        ch.id === channel.id ? { ...ch, unread_count: 0 } : ch
      )
    }))
  }, [])

  // Add a new function specifically for creating/opening DMs
  const createDirectMessage = useCallback(async (
    targetUserId: string,
    targetProfile: any
  ) => {
    if (!userId) return null

    try {
      setState(prev => ({ ...prev, loading: true }))
      
      const dmChannel = await createOrGetDirectMessageChannel(
        userId,
        targetUserId,
        targetProfile
      )

      // Reload channels to include the new DM
      await loadChannels()
      
      // Select the DM channel
      selectChannel(dmChannel)
      
      // Load messages for the DM
      if (dmChannel.id) {
        await loadMessages(dmChannel.id)
        await loadChannelMembers(dmChannel.id)
      }

      return dmChannel
    } catch (error) {
      console.error('Error creating direct message:', error)
      Alert.alert('Error', 'Failed to start direct message')
      return null
    } finally {
      setState(prev => ({ ...prev, loading: false }))
    }
  }, [userId, loadChannels, selectChannel, loadMessages, loadChannelMembers])
  
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

  const sendMessage = useCallback(async (content: string, replyToId?: string) => {
    if (!userId || !state.selectedChannel) return null

    const sanitized = sanitizeMessage(content)
    if (!sanitized) return null

    // Find the reply message if replyToId is provided
    const replyMessage = replyToId 
      ? state.messages.find(msg => msg.id === replyToId)
      : undefined

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
      read_count: 0,
      reactions: [],
      reply_to: replyToId,
      reply_message: replyMessage
    }

    setState(prev => ({ 
      ...prev, 
      messages: [...prev.messages, optimisticMessage],
      sending: true 
    }))

    try {
      const sentMessage = await sendMessageAPI(
        sanitized, 
        state.selectedChannel.id, 
        userId,
        replyToId
      )
      
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
  }, [userId, state.selectedChannel, state.messages])

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

  const updateMessage = useCallback((messageId: string, updateFn: (msg: Message) => Partial<Message>) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg =>
        msg.id === messageId ? { ...msg, ...updateFn(msg) } : msg
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

  const addReactionToMessage = useCallback((reaction: Reaction) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg => {
        if (msg.id === reaction.message_id) {
          const currentReactions = msg.reactions || []
          // Check if reaction already exists to avoid duplicates
          const exists = currentReactions.some(r => r.id === reaction.id)
          if (!exists) {
            return {
              ...msg,
              reactions: [...currentReactions, reaction]
            }
          }
        }
        return msg
      })
    }))
  }, [])

  const removeReactionFromMessage = useCallback((reactionId: string, messageId: string) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg => {
        if (msg.id === messageId) {
          const currentReactions = msg.reactions || []
          return {
            ...msg,
            reactions: currentReactions.filter(r => r.id !== reactionId)
          }
        }
        return msg
      })
    }))
  }, [])

  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!userId) return

    try {
      const updatedMessage = await updateMessageAPI(messageId, newContent, userId)
      
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === messageId ? updatedMessage : msg
        )
      }))

      return updatedMessage
    } catch (error) {
      console.error('Error editing message:', error)
      Alert.alert('Error', 'Failed to edit message')
      throw error
    }
  }, [userId])

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
    addReactionToMessage,
    removeReactionFromMessage,
    setTypingUsers,
    updateChannelUnreadCount,
    refresh,
    editMessage,
    createDirectMessage // Add this new function
  }
}