// services/messageService.ts
import { supabase } from '../lib/supabase'
import { Message } from '../types/chat'

export const fetchMessages = async (channelId: string): Promise<Message[]> => {
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

  const messageIds = messagesData?.map(m => m.id) || []
  const { data: readReceipts } = await supabase
    .from('chat_message_reads')
    .select('message_id, user_id')
    .in('message_id', messageIds)

  const readsByMessage = (readReceipts || []).reduce((acc, read) => {
    if (!acc[read.message_id]) {
      acc[read.message_id] = []
    }
    acc[read.message_id].push(read.user_id)
    return acc
  }, {} as Record<string, string[]>)

  return (messagesData || []).map(msg => ({
    ...msg,
    read_by: readsByMessage[msg.id] || [],
    read_count: (readsByMessage[msg.id] || []).length
  }))
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