// services/messageService.ts
import { supabase } from '../lib/supabase'
import { Message } from '../types/chat'


import { getMessageReactions } from './reactionService'

export const fetchMessages = async (channelId: string) => {
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

  // Fetch reactions for each message
  const messagesWithReactions = await Promise.all(
    (messages || []).map(async (message) => {
      const reactions = await getMessageReactions(message.id)
      return {
        ...message,
        reactions: reactions || []
      }
    })
  )

  return messagesWithReactions
}

// ... rest of your messageService functions

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
  
  return { ...data, read_by: [], read_count: 0 }
}

export const deleteMessage = async (messageId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('id', messageId)
    .eq('user_id', userId)

  if (error) throw error
}