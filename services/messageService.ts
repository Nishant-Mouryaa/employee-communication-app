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
        avatar_url,
         department,
        position
      )
    `)
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true })

  if (error) throw error
  if (!messages || messages.length === 0) return []

  // Fetch reply messages
  const replyIds = messages
    .filter(m => m.reply_to)
    .map(m => m.reply_to)
  
  let replyMessages = new Map()
  if (replyIds.length > 0) {
    const { data: replies } = await supabase
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
      .in('id', replyIds)
    
    replies?.forEach(reply => {
      replyMessages.set(reply.id, reply)
    })
  }

  // Fetch read receipts for all messages
  const messageIds = messages.map(m => m.id)
  const { data: reads, error: readsError } = await supabase
    .from('chat_message_reads')
    .select('message_id, user_id')
    .in('message_id', messageIds)

  if (readsError) {
    console.error('Error fetching read receipts:', readsError)
  }

  const readsByMessage = new Map<string, string[]>()
  reads?.forEach(read => {
    const existing = readsByMessage.get(read.message_id) || []
    readsByMessage.set(read.message_id, [...existing, read.user_id])
  })

  // Fetch reactions and combine everything
  const messagesWithReactionsAndReads = await Promise.all(
    messages.map(async (message) => {
      const reactions = await getMessageReactions(message.id)
      const readBy = readsByMessage.get(message.id) || []
      const replyMessage = message.reply_to ? replyMessages.get(message.reply_to) : null
      
      return {
        ...message,
        reactions: reactions || [],
        read_by: readBy,
        read_count: readBy.length,
        reply_message: replyMessage
      }
    })
  )

  return messagesWithReactionsAndReads
}

export const sendMessage = async (
  content: string,
  channelId: string,
  userId: string,
  replyToId?: string
): Promise<Message> => {
  const messageData: any = {
    content,
    channel_id: channelId,
    user_id: userId,
  }

  if (replyToId) {
    messageData.reply_to = replyToId
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert([messageData])
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

  // Fetch reply message if exists
  let replyMessage = null
  if (data.reply_to) {
    const { data: replyData } = await supabase
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
      .eq('id', data.reply_to)
      .single()
    
    replyMessage = replyData
  }
  
  return { 
    ...data, 
    reactions: [],
    read_by: [], 
    read_count: 0,
    reply_message: replyMessage
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




export const updateMessage = async (
  messageId: string,
  newContent: string,
  userId: string
): Promise<Message> => {
  // First verify the user owns this message
  const { data: existingMessage, error: fetchError } = await supabase
    .from('chat_messages')
    .select('user_id')
    .eq('id', messageId)
    .single()

  if (fetchError) throw fetchError
  if (existingMessage.user_id !== userId) {
    throw new Error('Unauthorized: You can only edit your own messages')
  }

  // Update the message
  const { data, error } = await supabase
    .from('chat_messages')
    .update({
      content: newContent,
      edited_at: new Date().toISOString(),
      is_edited: true,
    })
    .eq('id', messageId)
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

  // Fetch reply message if exists
  let replyMessage = null
  if (data.reply_to) {
    const { data: replyData } = await supabase
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
      .eq('id', data.reply_to)
      .single()
    
    replyMessage = replyData
  }

  // Fetch reactions
  const reactions = await getMessageReactions(messageId)

  // Fetch read receipts
  const { data: reads } = await supabase
    .from('chat_message_reads')
    .select('user_id')
    .eq('message_id', messageId)

  const readBy = reads?.map(r => r.user_id) || []

  return {
    ...data,
    reactions: reactions || [],
    read_by: readBy,
    read_count: readBy.length,
    reply_message: replyMessage,
  }
}