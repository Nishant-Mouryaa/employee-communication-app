// screens/ChatScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Pressable,
  Dimensions,
  SafeAreaView,
  RefreshControl
} from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { RealtimeChannel } from '@supabase/supabase-js'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const IS_MOBILE = SCREEN_WIDTH < 768

interface Channel {
  id: string
  name: string
  description: string
  unread_count: number
  created_at: string
}

interface Message {
  id: string
  content: string
  user_id: string
  channel_id: string
  created_at: string
  profiles: {
    id?: string
    username: string
    full_name: string
    avatar_url?: string
  }
}

export default function ChatScreen() {
  const { user } = useAuth()
  const [channels, setChannels] = useState<Channel[]>([])
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [hasUserChecked, setHasUserChecked] = useState(false)
  const [showChannelModal, setShowChannelModal] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  
  const flatListRef = useRef<FlatList>(null)
  const channelSubscriptionRef = useRef<RealtimeChannel | null>(null)
  const typingSubscriptionRef = useRef<RealtimeChannel | null>(null)
  const fetchingRef = useRef(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (user?.id) {
      setHasUserChecked(true)
      fetchChannels()
    } else {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    // Cleanup existing subscriptions
    if (channelSubscriptionRef.current) {
      supabase.removeChannel(channelSubscriptionRef.current)
      channelSubscriptionRef.current = null
    }
    if (typingSubscriptionRef.current) {
      supabase.removeChannel(typingSubscriptionRef.current)
      typingSubscriptionRef.current = null
    }

    if (selectedChannel?.id && user?.id) {
      fetchMessages(selectedChannel.id)
      const messageSubscription = setupRealtimeSubscription(selectedChannel.id)
      const typingSubscription = setupTypingSubscription(selectedChannel.id)
      channelSubscriptionRef.current = messageSubscription
      typingSubscriptionRef.current = typingSubscription
    }

    return () => {
      if (channelSubscriptionRef.current) {
        supabase.removeChannel(channelSubscriptionRef.current)
        channelSubscriptionRef.current = null
      }
      if (typingSubscriptionRef.current) {
        supabase.removeChannel(typingSubscriptionRef.current)
        typingSubscriptionRef.current = null
      }
    }
  }, [selectedChannel?.id, user?.id])

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  const fetchChannels = async () => {
    if (!user?.id || fetchingRef.current) {
      setLoading(false)
      return
    }

    try {
      fetchingRef.current = true
      setLoading(true)
      
      const { data: memberData, error: memberError } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', user.id)

      if (memberError) {
        console.error('Member error:', memberError)
        throw memberError
      }

      if (memberData && memberData.length > 0) {
        const channelIds = memberData.map(member => member.channel_id)
        
        const { data: channelsData, error: channelsError } = await supabase
          .from('channels')
          .select('*')
          .in('id', channelIds)
          .order('name')

        if (channelsError) {
          console.error('Channels error:', channelsError)
          throw channelsError
        }

        // OPTIMIZED: Batch fetch all unread counts at once
        const [readMessages, allMessages] = await Promise.all([
          supabase
            .from('chat_message_reads')
            .select('message_id')
            .eq('user_id', user.id),
          supabase
            .from('chat_messages')
            .select('id, channel_id, user_id')
            .in('channel_id', channelIds)
            .neq('user_id', user.id)
        ])

        const readMessageIds = new Set(
          readMessages.data?.map(msg => msg.message_id) || []
        )

        // Group messages by channel
        const unreadByChannel = (allMessages.data || []).reduce((acc, msg) => {
          if (!readMessageIds.has(msg.id)) {
            acc[msg.channel_id] = (acc[msg.channel_id] || 0) + 1
          }
          return acc
        }, {} as Record<string, number>)

        const channelsWithUnread = (channelsData || []).map(channel => ({
          ...channel,
          unread_count: unreadByChannel[channel.id] || 0
        }))

        setChannels(channelsWithUnread)
        if (channelsWithUnread.length > 0 && !selectedChannel) {
          setSelectedChannel(channelsWithUnread[0])
        }
      } else {
        await addUserToDefaultChannels()
        // Don't recursively call, just refetch once
        fetchingRef.current = false
        await fetchChannels()
      }
    } catch (error) {
      console.error('Error fetching channels:', error)
      Alert.alert('Error', 'Failed to load channels. Please try again.')
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }

  const addUserToDefaultChannels = async () => {
    if (!user?.id) return

    try {
      await createDefaultChannels()
      
      const defaultChannelIds = [
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222', 
        '33333333-3333-3333-3333-333333333333',
        '44444444-4444-4444-4444-444444444444'
      ]

      const channelMembers = defaultChannelIds.map(channelId => ({
        channel_id: channelId,
        user_id: user.id
      }))

      const { error } = await supabase
        .from('channel_members')
        .upsert(channelMembers, { 
          onConflict: 'channel_id,user_id'
        })

      if (error) {
        console.error('Error adding user to channels:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in addUserToDefaultChannels:', error)
    }
  }

  const createDefaultChannels = async () => {
    if (!user?.id) return

    try {
      const defaultChannels = [
        { 
          id: '11111111-1111-1111-1111-111111111111', 
          name: 'general', 
          description: 'General discussions and announcements',
          created_by: user.id
        },
        { 
          id: '22222222-2222-2222-2222-222222222222', 
          name: 'random', 
          description: 'Random conversations and fun stuff',
          created_by: user.id
        },
        { 
          id: '33333333-3333-3333-3333-333333333333', 
          name: 'tech', 
          description: 'Technical discussions and help',
          created_by: user.id
        },
        { 
          id: '44444444-4444-4444-4444-444444444444', 
          name: 'design', 
          description: 'Design team discussions',
          created_by: user.id
        }
      ]

      const { error } = await supabase
        .from('channels')
        .upsert(defaultChannels, { 
          onConflict: 'id'
        })

      if (error) {
        console.error('Error creating default channels:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in createDefaultChannels:', error)
      throw error
    }
  }

const fetchMessages = async (channelId: string) => {
  if (!user) return

  try {
    // Now use the correct foreign key name
    const { data: messagesData, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        profiles!fk_chat_messages_user_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })

    if (error) throw error

    setMessages(messagesData || [])

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true })
    }, 100)
    
    await markMessagesAsRead(channelId)
  } catch (error) {
    console.error('Error fetching messages:', error)
    Alert.alert('Error', 'Failed to load messages')
  }
}

const setupRealtimeSubscription = (channelId: string): RealtimeChannel => {
  const channel = supabase
    .channel(`chat_messages:${channelId}:${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`
      },
      async (payload) => {
        if (!user) return

        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .eq('id', payload.new.user_id)
            .single()

          const messageWithProfile = {
            ...payload.new,
            profiles: profile || { 
              id: payload.new.user_id,
              username: 'Unknown', 
              full_name: 'Unknown User', 
              avatar_url: null 
            }
          } as Message

          setMessages(prev => {
            // Don't add duplicate messages
            const exists = prev.some(msg => 
              msg.id === messageWithProfile.id || 
              (msg.id.startsWith('temp-') && 
               msg.content === messageWithProfile.content && 
               msg.user_id === messageWithProfile.user_id)
            )
            
            if (exists) {
              // Replace temp message with real one
              return prev.map(msg => 
                msg.id.startsWith('temp-') && 
                msg.content === messageWithProfile.content && 
                msg.user_id === messageWithProfile.user_id
                  ? messageWithProfile
                  : msg
              )
            }
            
            return [...prev, messageWithProfile]
          })
          
          if (payload.new.user_id !== user.id) {
            await markMessageAsRead(payload.new.id)
          }

          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true })
          }, 100)
        } catch (error) {
          console.error('Error in realtime subscription:', error)
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`
      },
      (payload) => {
        setMessages(prev => prev.filter(msg => msg.id !== payload.old.id))
      }
    )
    .subscribe()

  return channel
}

  const setupTypingSubscription = (channelId: string): RealtimeChannel => {
    const channel = supabase
      .channel(`typing:${channelId}:${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `channel_id=eq.${channelId}`
        },
        (payload) => {
          if (!user) return
          
          // Don't show own typing
          if (payload.new && payload.new.user_id !== user.id) {
            const typedTime = new Date(payload.new.last_typed).getTime()
            const now = Date.now()
            
            // Only show typing if within last 3 seconds
            if (now - typedTime < 3000) {
              setTypingUsers(prev => new Set(prev).add(payload.new.user_id))
              
              // Remove after 3 seconds
              setTimeout(() => {
                setTypingUsers(prev => {
                  const newSet = new Set(prev)
                  newSet.delete(payload.new.user_id)
                  return newSet
                })
              }, 3000)
            }
          }
        }
      )
      .subscribe()

    return channel
  }

  const handleTyping = useCallback(() => {
    if (!selectedChannel || !user) return
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Debounce typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      supabase
        .from('typing_indicators')
        .upsert({
          channel_id: selectedChannel.id,
          user_id: user.id,
          last_typed: new Date().toISOString()
        })
        .then(() => {
          // Auto-delete after 3 seconds
          setTimeout(() => {
            supabase
              .from('typing_indicators')
              .delete()
              .eq('channel_id', selectedChannel.id)
              .eq('user_id', user.id)
              .then()
          }, 3000)
        })
    }, 300)
  }, [selectedChannel, user])

  const markMessagesAsRead = async (channelId: string) => {
    if (!user) return

    try {
      const { data: unreadMessages, error: unreadError } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('channel_id', channelId)
        .neq('user_id', user.id)

      if (unreadError || !unreadMessages?.length) {
        return
      }

      const { data: existingReads } = await supabase
        .from('chat_message_reads')
        .select('message_id')
        .eq('user_id', user.id)
        .in('message_id', unreadMessages.map(msg => msg.id))

      const existingReadIds = new Set(existingReads?.map(read => read.message_id) || [])
      const newReads = unreadMessages
        .filter(msg => !existingReadIds.has(msg.id))
        .map(msg => ({
          message_id: msg.id,
          user_id: user.id,
          read_at: new Date().toISOString()
        }))

      if (newReads.length > 0) {
        const { error: insertError } = await supabase
          .from('chat_message_reads')
          .insert(newReads)

        if (insertError) {
          console.error('Error inserting read receipts:', insertError)
          return
        }

        await updateChannelUnreadCount(channelId)
      }
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const markMessageAsRead = async (messageId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('chat_message_reads')
        .upsert({
          message_id: messageId,
          user_id: user.id,
          read_at: new Date().toISOString()
        }, { 
          onConflict: 'message_id,user_id'
        })

      if (error) {
        console.error('Error marking message as read:', error)
        return
      }

      if (selectedChannel) {
        await updateChannelUnreadCount(selectedChannel.id)
      }
    } catch (error) {
      console.error('Error marking message as read:', error)
    }
  }

  const updateChannelUnreadCount = async (channelId: string) => {
    if (!user?.id) return

    try {
      const [readMessages, channelMessages] = await Promise.all([
        supabase
          .from('chat_message_reads')
          .select('message_id')
          .eq('user_id', user.id),
        supabase
          .from('chat_messages')
          .select('id')
          .eq('channel_id', channelId)
          .neq('user_id', user.id)
      ])

      const readMessageIds = new Set(readMessages.data?.map(msg => msg.message_id) || [])
      const unreadCount = channelMessages.data?.filter(msg => 
        !readMessageIds.has(msg.id)
      ).length || 0

      setChannels(prev => 
        prev.map(ch => 
          ch.id === channelId ? { ...ch, unread_count: unreadCount } : ch
        )
      )
    } catch (error) {
      console.error('Error updating unread count:', error)
    }
  }

  const sanitizeMessage = (text: string): string => {
    return text
      .trim()
      .replace(/[<>]/g, '') // Basic XSS prevention
      .slice(0, 500) // Enforce max length
  }

const sendMessage = async () => {
  if (!message.trim() || !selectedChannel || !user) return

  const sanitizedContent = sanitizeMessage(message)
  if (!sanitizedContent) return

  const optimisticMessage: Message = {
    id: `temp-${Date.now()}`,
    content: sanitizedContent,
    channel_id: selectedChannel.id,
    user_id: user.id,
    created_at: new Date().toISOString(),
    profiles: {
      id: user.id,
      username: user.email?.split('@')[0] || 'You',
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'You',
      avatar_url: user.user_metadata?.avatar_url
    }
  }

  // Immediately update UI (Optimistic Update)
  setMessages(prev => [...prev, optimisticMessage])
  setMessage('')
  
  // Scroll to bottom
  setTimeout(() => {
    flatListRef.current?.scrollToEnd({ animated: true })
  }, 100)

  try {
    setSending(true)
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([
        {
          content: sanitizedContent,
          channel_id: selectedChannel.id,
          user_id: user.id
        }
      ])
      .select(`
        *,
        profiles!fk_chat_messages_user_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .single()

    if (error) throw error

    // Replace temp message with real one
    if (data) {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === optimisticMessage.id ? data : msg
        )
      )
    }

    // Clear typing indicator
    await supabase
      .from('typing_indicators')
      .delete()
      .eq('channel_id', selectedChannel.id)
      .eq('user_id', user.id)
      .then(() => {})
      .catch(() => {})

  } catch (error) {
    // Remove optimistic message on failure
    setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
    setMessage(optimisticMessage.content) // Restore message
    console.error('Error sending message:', error)
    Alert.alert('Error', 'Failed to send message. Please try again.')
  } finally {
    setSending(false)
  }
}

  const deleteMessage = async (messageId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', user.id) // Only delete own messages

      if (error) throw error

      setMessages(prev => prev.filter(msg => msg.id !== messageId))
    } catch (error) {
      console.error('Error deleting message:', error)
      Alert.alert('Error', 'Failed to delete message')
    }
  }

  const handleDeleteMessage = (messageId: string, isOwn: boolean) => {
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
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchChannels()
    if (selectedChannel) {
      await fetchMessages(selectedChannel.id)
    }
    setRefreshing(false)
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const isOwnMessage = (messageUserId: string) => {
    return messageUserId === user?.id
  }

  const getUserInitials = (name: string) => {
    if (!name) return '??'
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleChannelSelect = async (channel: Channel) => {
    setSelectedChannel(channel)
    setShowChannelModal(false)
    setChannels(prev => 
      prev.map(ch => 
        ch.id === channel.id ? { ...ch, unread_count: 0 } : ch
      )
    )
  }

  const getTotalUnreadCount = () => {
    return channels.reduce((sum, channel) => sum + channel.unread_count, 0)
  }

  // Render typing indicator
  const renderTypingIndicator = () => {
    if (typingUsers.size === 0) return null

    return (
      <View style={styles.typingIndicator}>
        <View style={styles.typingDots}>
          <View style={[styles.typingDot, styles.typingDot1]} />
          <View style={[styles.typingDot, styles.typingDot2]} />
          <View style={[styles.typingDot, styles.typingDot3]} />
        </View>
        <Text style={styles.typingText}>
          {typingUsers.size === 1 ? 'Someone is typing...' : `${typingUsers.size} people are typing...`}
        </Text>
      </View>
    )
  }

  // Channel Modal Component
  const ChannelModal = () => (
    <Modal
      visible={showChannelModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowChannelModal(false)}
    >
      <Pressable 
        style={styles.modalOverlay}
        onPress={() => setShowChannelModal(false)}
      >
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Channels</Text>
            <TouchableOpacity onPress={() => setShowChannelModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={channels}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalChannelItem,
                  selectedChannel?.id === item.id && styles.modalSelectedChannel
                ]}
                onPress={() => handleChannelSelect(item)}
              >
                <View style={styles.channelInfo}>
                  <Text style={[
                    styles.channelHash,
                    selectedChannel?.id === item.id && styles.selectedChannelText
                  ]}>#</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.channelName,
                      selectedChannel?.id === item.id && styles.selectedChannelText
                    ]}>
                      {item.name}
                    </Text>
                    <Text style={[
                      styles.channelDescriptionSmall,
                      selectedChannel?.id === item.id && styles.selectedChannelText
                    ]}>
                      {item.description}
                    </Text>
                  </View>
                </View>
                {item.unread_count > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>
                      {item.unread_count > 99 ? '99+' : item.unread_count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  )

  if (!hasUserChecked || loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>
          {!user ? 'Waiting for authentication...' : 'Loading channels...'}
        </Text>
      </SafeAreaView>
    )
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>Please log in to access chat</Text>
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
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Mobile Header */}
          <View style={styles.mobileHeader}>
            <TouchableOpacity 
              style={styles.channelButton}
              onPress={() => setShowChannelModal(true)}
            >
              <Text style={styles.channelButtonHash}>#</Text>
              <Text style={styles.channelButtonText} numberOfLines={1}>
                {selectedChannel?.name || 'Select Channel'}
              </Text>
              {getTotalUnreadCount() > 0 && (
                <View style={styles.headerUnreadBadge}>
                  <Text style={styles.unreadText}>
                    {getTotalUnreadCount() > 99 ? '99+' : getTotalUnreadCount()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {selectedChannel ? (
            <>
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                style={styles.messagesList}
                contentContainerStyle={styles.messagesContainerMobile}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl 
                    refreshing={refreshing} 
                    onRefresh={onRefresh}
                    tintColor="#6366F1"
                  />
                }
                onContentSizeChange={() => {
                  flatListRef.current?.scrollToEnd({ animated: false })
                }}
                renderItem={({ item }) => (
                  <Pressable
                    onLongPress={() => handleDeleteMessage(item.id, isOwnMessage(item.user_id))}
                    delayLongPress={500}
                  >
                    <View style={[
                      styles.messageContainer,
                      isOwnMessage(item.user_id) && styles.ownMessageContainer
                    ]}>
                      <View style={styles.messageContent}>
                        {!isOwnMessage(item.user_id) && (
                          <View style={styles.avatarMobile}>
                            <Text style={styles.avatarText}>
                              {getUserInitials(item.profiles?.full_name || item.profiles?.username || 'Unknown')}
                            </Text>
                          </View>
                        )}
                        <View style={[
                          styles.messageBubble,
                          isOwnMessage(item.user_id) ? styles.ownMessageBubble : styles.otherMessageBubble
                        ]}>
                          {!isOwnMessage(item.user_id) && (
                            <Text style={styles.userName}>
                              {item.profiles?.full_name || item.profiles?.username || 'Unknown User'}
                            </Text>
                          )}
                          <Text style={[
                            styles.messageText,
                            isOwnMessage(item.user_id) ? styles.ownMessageText : styles.otherMessageText
                          ]}>
                            {item.content}
                          </Text>
                          <Text style={[
                            styles.messageTime,
                            isOwnMessage(item.user_id) && styles.ownMessageTime
                          ]}>
                            {formatTime(item.created_at)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyMessages}>
                    <Text style={styles.emptyMessageEmoji}>💬</Text>
                    <Text style={styles.emptyMessageText}>No messages yet</Text>
                    <Text style={styles.emptyMessageSubtext}>
                      Be the first to start the conversation in #{selectedChannel.name}!
                    </Text>
                  </View>
                }
                ListFooterComponent={renderTypingIndicator}
              />

              <View style={styles.inputContainerMobile}>
                <TextInput
                  style={styles.textInputMobile}
                  value={message}
                  onChangeText={(text) => {
                    setMessage(text)
                    handleTyping()
                  }}
                  placeholder={`Message #${selectedChannel.name}`}
                  placeholderTextColor="#999"
                  multiline
                  maxLength={500}
                  editable={!sending}
                />
                <TouchableOpacity 
                  style={[
                    styles.sendButtonMobile,
                    (!message.trim() || sending) && styles.sendButtonDisabled
                  ]} 
                  onPress={sendMessage}
                  disabled={!message.trim() || sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.sendButtonText}>➤</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.noChannelSelected}>
              <Text style={styles.noChannelEmoji}>💭</Text>
              <Text style={styles.noChannelText}>Tap to select a channel</Text>
              <TouchableOpacity 
                style={styles.selectChannelButton}
                onPress={() => setShowChannelModal(true)}
              >
                <Text style={styles.selectChannelButtonText}>Select Channel</Text>
              </TouchableOpacity>
            </View>
          )}

          <ChannelModal />
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.headerSubtitle}>Team communication</Text>
      </View>

      <View style={styles.content}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>CHANNELS</Text>
          <FlatList
            data={channels}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                tintColor="#6366F1"
              />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.channelItem,
                  selectedChannel?.id === item.id && styles.selectedChannel
                ]}
                onPress={() => handleChannelSelect(item)}
              >
                <View style={styles.channelInfo}>
                  <Text style={[
                    styles.channelHash,
                    selectedChannel?.id === item.id && styles.selectedChannelText
                  ]}>#</Text>
                  <Text style={[
                    styles.channelName,
                    selectedChannel?.id === item.id && styles.selectedChannelText
                  ]}>
                    {item.name}
                  </Text>
                </View>
                {item.unread_count > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>
                      {item.unread_count > 99 ? '99+' : item.unread_count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyChannels}>
                <Text style={styles.emptyText}>No channels available</Text>
              </View>
            }
          />
        </View>

        {/* Chat Area */}
        <View style={styles.chatArea}>
          {selectedChannel ? (
            <>
              <View style={styles.chatHeader}>
                <View style={styles.channelHeader}>
                  <Text style={styles.channelTitle}>#{selectedChannel.name}</Text>
                  <Text style={styles.channelDescription}>
                    {selectedChannel.description || 'Team channel'}
                  </Text>
                </View>
              </View>

              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                style={styles.messagesList}
                contentContainerStyle={styles.messagesContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl 
                    refreshing={refreshing} 
                    onRefresh={onRefresh}
                    tintColor="#6366F1"
                  />
                }
                onContentSizeChange={() => {
                  flatListRef.current?.scrollToEnd({ animated: false })
                }}
                renderItem={({ item }) => (
                  <Pressable
                    onLongPress={() => handleDeleteMessage(item.id, isOwnMessage(item.user_id))}
                    delayLongPress={500}
                  >
                    <View style={[
                      styles.messageContainer,
                      isOwnMessage(item.user_id) && styles.ownMessageContainer
                    ]}>
                      <View style={styles.messageContent}>
                        {!isOwnMessage(item.user_id) && (
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                              {getUserInitials(item.profiles?.full_name || item.profiles?.username || 'Unknown')}
                            </Text>
                          </View>
                        )}
                        <View style={[
                          styles.messageBubble,
                          isOwnMessage(item.user_id) ? styles.ownMessageBubble : styles.otherMessageBubble
                        ]}>
                          {!isOwnMessage(item.user_id) && (
                            <Text style={styles.userName}>
                              {item.profiles?.full_name || item.profiles?.username || 'Unknown User'}
                            </Text>
                          )}
                          <Text style={[
                            styles.messageText,
                            isOwnMessage(item.user_id) ? styles.ownMessageText : styles.otherMessageText
                          ]}>
                            {item.content}
                          </Text>
                          <Text style={styles.messageTime}>
                            {formatTime(item.created_at)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyMessages}>
                    <Text style={styles.emptyMessageEmoji}>💬</Text>
                    <Text style={styles.emptyMessageText}>No messages yet</Text>
                    <Text style={styles.emptyMessageSubtext}>
                      Be the first to start the conversation in #{selectedChannel.name}!
                    </Text>
                  </View>
                }
                ListFooterComponent={renderTypingIndicator}
              />

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={message}
                  onChangeText={(text) => {
                    setMessage(text)
                    handleTyping()
                  }}
                  placeholder={`Message #${selectedChannel.name}`}
                  placeholderTextColor="#999"
                  multiline
                  maxLength={500}
                  editable={!sending}
                />
                <TouchableOpacity 
                  style={[
                    styles.sendButton,
                    (!message.trim() || sending) && styles.sendButtonDisabled
                  ]} 
                  onPress={sendMessage}
                  disabled={!message.trim() || sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.sendButtonText}>Send</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.noChannelSelected}>
              <Text style={styles.noChannelEmoji}>💭</Text>
              <Text style={styles.noChannelText}>Select a channel to start chatting</Text>
            </View>
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
  header: {
    backgroundColor: '#6366F1',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  
  // Mobile Header Styles
  mobileHeader: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  channelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  channelButtonHash: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginRight: 8,
  },
  channelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    flex: 1,
  },
  headerUnreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalClose: {
    fontSize: 24,
    color: '#64748b',
    fontWeight: '300',
  },
  modalChannelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalSelectedChannel: {
    backgroundColor: '#eff6ff',
  },
  channelDescriptionSmall: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },

  content: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 280,
    backgroundColor: '#f8fafc',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    padding: 16,
  },
  sidebarTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 16,
    letterSpacing: 1,
  },
  channelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  selectedChannel: {
    backgroundColor: '#6366F1',
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  channelHash: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginRight: 8,
  },
  channelName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
    flex: 1,
  },
  selectedChannelText: {
    color: 'white',
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  chatHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: 'white',
  },
  channelHeader: {
    flexDirection: 'column',
  },
  channelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  channelDescription: {
    fontSize: 14,
    color: '#64748b',
  },
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
messageContainer: {
marginBottom: 16,
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
messageTime: {
fontSize: 11,
color: '#94a3b8',
alignSelf: 'flex-end',
},
ownMessageTime: {
color: 'rgba(255, 255, 255, 0.7)',
},

// Typing Indicator Styles
typingIndicator: {
flexDirection: 'row',
alignItems: 'center',
paddingVertical: 12,
paddingHorizontal: 16,
},
typingDots: {
flexDirection: 'row',
alignItems: 'center',
marginRight: 8,
},
typingDot: {
width: 8,
height: 8,
borderRadius: 4,
backgroundColor: '#94a3b8',
marginHorizontal: 2,
},
typingDot1: {
opacity: 0.4,
},
typingDot2: {
opacity: 0.6,
},
typingDot3: {
opacity: 0.8,
},
typingText: {
fontSize: 13,
color: '#64748b',
fontStyle: 'italic',
},

inputContainer: {
flexDirection: 'row',
padding: 16,
backgroundColor: 'white',
borderTopWidth: 1,
borderTopColor: '#f1f5f9',
alignItems: 'flex-end',
},
inputContainerMobile: {
flexDirection: 'row',
padding: 12,
paddingBottom: Platform.OS === 'ios' ? 12 : 12,
backgroundColor: 'white',
borderTopWidth: 1,
borderTopColor: '#e2e8f0',
alignItems: 'flex-end',
},
textInput: {
flex: 1,
borderWidth: 1,
borderColor: '#e2e8f0',
borderRadius: 24,
paddingHorizontal: 16,
paddingVertical: 12,
marginRight: 12,
maxHeight: 100,
fontSize: 15,
backgroundColor: '#f8fafc',
},
textInputMobile: {
flex: 1,
borderWidth: 1,
borderColor: '#e2e8f0',
borderRadius: 20,
paddingHorizontal: 16,
paddingVertical: 10,
marginRight: 8,
maxHeight: 100,
fontSize: 15,
backgroundColor: '#f8fafc',
},
sendButton: {
backgroundColor: '#6366F1',
paddingHorizontal: 20,
paddingVertical: 12,
borderRadius: 24,
justifyContent: 'center',
alignItems: 'center',
minWidth: 60,
},
sendButtonMobile: {
backgroundColor: '#6366F1',
width: 44,
height: 44,
borderRadius: 22,
justifyContent: 'center',
alignItems: 'center',
},
sendButtonDisabled: {
backgroundColor: '#cbd5e1',
},
sendButtonText: {
color: 'white',
fontSize: 15,
fontWeight: '600',
},
loadingContainer: {
flex: 1,
justifyContent: 'center',
alignItems: 'center',
backgroundColor: 'white',
},
loadingText: {
marginTop: 12,
fontSize: 16,
color: '#64748b',
},
emptyChannels: {
padding: 20,
alignItems: 'center',
},
emptyText: {
color: '#94a3b8',
fontSize: 14,
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
noChannelSelected: {
flex: 1,
justifyContent: 'center',
alignItems: 'center',
backgroundColor: '#f8fafc',
padding: 20,
},
noChannelEmoji: {
fontSize: 64,
marginBottom: 16,
},
noChannelText: {
fontSize: 16,
color: '#64748b',
marginBottom: 16,
fontWeight: '500',
},
selectChannelButton: {
backgroundColor: '#6366F1',
paddingHorizontal: 24,
paddingVertical: 12,
borderRadius: 12,
},
selectChannelButtonText: {
color: 'white',
fontSize: 16,
fontWeight: '600',
},
errorText: {
fontSize: 16,
color: '#EF4444',
textAlign: 'center',
},
})