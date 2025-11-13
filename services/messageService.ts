// services/messageService.ts
import { supabase } from '../lib/supabase'
import { Message, MessageAttachment } from '../types/chat'
import { getMessageReactions } from './reactionService'

export const fetchMessages = async (channelId: string, userId?: string) => {
  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select(`
      *,
      profiles!fk_chat_messages_user_id (
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
        profiles!fk_chat_messages_user_id (
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

  // Fetch starred status for current user if provided
  let starredMessageIds = new Set<string>()
  if (userId) {
    const { data: bookmarks } = await supabase
      .from('message_bookmarks')
      .select('message_id')
      .eq('user_id', userId)
      .in('message_id', messages.map(m => m.id))
    
    starredMessageIds = new Set(bookmarks?.map(b => b.message_id) || [])
  }

  // Fetch reactions and combine everything, decrypt if needed
  const messagesWithReactionsAndReads = await Promise.all(
    messages.map(async (message) => {
      const reactions = await getMessageReactions(message.id)
      const readBy = readsByMessage.get(message.id) || []
      const replyMessage = message.reply_to ? replyMessages.get(message.reply_to) : null
      
      // Decrypt message if encrypted
      let decryptedContent = message.content
      if (message.is_encrypted && message.encryption_key) {
        try {
          const { decryptMessage } = await import('../utils/encryption')
          decryptedContent = await decryptMessage(message.content, message.encryption_key)
        } catch (error) {
          console.warn('Decryption failed for message:', message.id, error)
          decryptedContent = '[Encrypted message - decryption failed]'
        }
      }
      
      return {
        ...message,
        content: decryptedContent,
        attachments: message.attachments || [],
        reactions: reactions || [],
        read_by: readBy,
        read_count: readBy.length,
        reply_message: replyMessage,
        is_starred: starredMessageIds.has(message.id)
      }
    })
  )

  return messagesWithReactionsAndReads
}


export const sendMessage = async (
  content: string,
  channelId: string,
  userId: string,
  replyToId?: string,
  attachments?: MessageAttachment[]
): Promise<Message> => {
  // Check access control
  const { canAccessChannel } = await import('./accessControlService')
  const accessCheck = await canAccessChannel(userId, channelId)
  if (!accessCheck.allowed) {
    throw new Error(accessCheck.reason || 'Access denied')
  }

  // Extract mentions from content
  const mentionMatches = content.matchAll(/@(\w+)/g)
  const mentionedUsernames = Array.from(mentionMatches, m => m[1])
  
  // Fetch user IDs for mentioned usernames
  const { data: mentionedUsers } = await supabase
    .from('profiles')
    .select('id')
    .in('username', mentionedUsernames)
  
  const mentionedUserIds = mentionedUsers?.map(u => u.id) || []

  // Apply encryption if enabled (transport-level)
  let encryptedContent = content
  let encryptionKey: string | null = null
  
  try {
    const { getComplianceSettings } = await import('./complianceService')
    const settings = await getComplianceSettings()
    
    if (settings?.encryption_enabled) {
      const { generateEncryptionKey, encryptMessage } = await import('../utils/encryption')
      encryptionKey = await generateEncryptionKey()
      encryptedContent = await encryptMessage(content, encryptionKey)
    }
  } catch (error) {
    console.warn('Encryption failed, sending plaintext:', error)
    // Continue with plaintext if encryption fails
  }

  const messageData: any = {
    content: encryptedContent,
    channel_id: channelId,
    user_id: userId,
    mentions: mentionedUserIds.length > 0 ? mentionedUserIds : null,
    attachments: attachments && attachments.length > 0 ? attachments : null,
    encryption_key: encryptionKey, // Store key for decryption (in production, use proper key management)
    is_encrypted: !!encryptionKey
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
    attachments: data.attachments || [],
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
    attachments: data.attachments || [],
    reactions: reactions || [],
    read_by: readBy,
    read_count: readBy.length,
    reply_message: replyMessage,
  }
}