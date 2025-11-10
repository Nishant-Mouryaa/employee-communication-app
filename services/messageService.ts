// services/messageService.ts
import { supabase } from '../lib/supabase'
import { Message } from '../types/chat'
import { getMessageReactions } from './reactionService'

export const fetchMessages = async (channelId: string) => {
  // Fetch messages with profiles
  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select(`
      *,
      profiles (
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true })

  if (error) throw error
  if (!messages || messages.length === 0) return []

  // Fetch read receipts for all messages in one query
  const messageIds = messages.map(m => m.id)
  const { data: reads, error: readsError } = await supabase
    .from('chat_message_reads')
    .select('message_id, user_id')
    .in('message_id', messageIds)

  if (readsError) {
    console.error('Error fetching read receipts:', readsError)
  }

  // Group reads by message_id
  const readsByMessage = new Map<string, string[]>()
  reads?.forEach(read => {
    const existing = readsByMessage.get(read.message_id) || []
    readsByMessage.set(read.message_id, [...existing, read.user_id])
  })

  // Fetch reactions for each message and combine with read receipts
  const messagesWithReactionsAndReads = await Promise.all(
    messages.map(async (message) => {
      const reactions = await getMessageReactions(message.id)
      const readBy = readsByMessage.get(message.id) || []
      
      return {
        ...message,
        reactions: reactions || [],
        read_by: readBy,
        read_count: readBy.length
      }
    })
  )

  return messagesWithReactionsAndReads
}

export const sendMessage = async (
  content: string,
  channelId: string,
  userId: string
): Promise<Message> => {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert([{ content, channel_id: channelId, user_id: userId }])
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
  
  // New messages start with no reads
  return { 
    ...data, 
    reactions: [],
    read_by: [], 
    read_count: 0 
  }
}

export const deleteMessage = async (messageId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('id', messageId)
    .eq('user_id', userId)

  if (error) throw error
}