// services/unreadSeparatorService.ts
import { supabase } from '../lib/supabase'

/**
 * Get the last read message timestamp for a user in a channel
 */
export const getLastReadTimestamp = async (
  userId: string,
  channelId: string
): Promise<string | null> => {
  try {
    // Get the most recent message that was read
    // Use read_at from chat_message_reads, or fallback to message created_at
    const { data, error } = await supabase
      .from('chat_message_reads')
      .select(`
        read_at,
        chat_messages!inner(
          created_at,
          channel_id
        )
      `)
      .eq('user_id', userId)
      .eq('chat_messages.channel_id', channelId)
      .order('read_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // No read messages
      throw error
    }

    // Use read_at if available, otherwise use message created_at
    return data?.read_at || data?.chat_messages?.created_at || null
  } catch (error) {
    console.error('Error fetching last read timestamp:', error)
    return null
  }
}

/**
 * Mark all messages in a channel as read up to a specific message
 */
export const markMessagesReadUpTo = async (
  userId: string,
  channelId: string,
  messageId: string
): Promise<void> => {
  try {
    // Get all unread messages up to this message
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('id, created_at')
      .eq('channel_id', channelId)
      .neq('user_id', userId) // Don't mark own messages as read
      .order('created_at', { ascending: true })

    if (messagesError) throw messagesError

    const targetMessage = messages?.find(m => m.id === messageId)
    if (!targetMessage) return

    // Get messages up to and including the target
    const messagesToMark = messages?.filter(
      m => new Date(m.created_at) <= new Date(targetMessage.created_at)
    ) || []

    // Get already read message IDs
    const { data: readMessages } = await supabase
      .from('chat_message_reads')
      .select('message_id')
      .eq('user_id', userId)
      .in('message_id', messagesToMark.map(m => m.id))

    const readMessageIds = new Set(readMessages?.map(r => r.message_id) || [])

    // Mark unread messages as read
    const unreadMessageIds = messagesToMark
      .map(m => m.id)
      .filter(id => !readMessageIds.has(id))

    if (unreadMessageIds.length > 0) {
      const reads = unreadMessageIds.map(messageId => ({
        user_id: userId,
        message_id: messageId,
      }))

      const { error: insertError } = await supabase
        .from('chat_message_reads')
        .insert(reads)

      if (insertError) throw insertError
    }
  } catch (error) {
    console.error('Error marking messages as read:', error)
    throw error
  }
}

/**
 * Check if a message is unread for a user
 */
export const isMessageUnread = async (
  messageId: string,
  userId: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('chat_message_reads')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return !data // Message is unread if no read record exists
  } catch (error) {
    console.error('Error checking if message is unread:', error)
    return true // Default to unread on error
  }
}

