// services/readReceiptService.ts
import { supabase } from '../lib/supabase'

export const markMessagesAsRead = async (
  channelId: string,
  userId: string,
  organizationId: string
): Promise<void> => {
  const { data: unreadMessages, error: unreadError } = await supabase
    .from('chat_messages')
    .select('id')
    .eq('channel_id', channelId)
    .eq('organization_id', organizationId)
    .neq('user_id', userId)

  if (unreadError || !unreadMessages?.length) return

  const { data: existingReads } = await supabase
    .from('chat_message_reads')
    .select('message_id')
    .eq('user_id', userId)
    .in('message_id', unreadMessages.map(msg => msg.id))
    .eq('organization_id', organizationId)

  const existingReadIds = new Set(existingReads?.map(read => read.message_id) || [])
  const newReads = unreadMessages
    .filter(msg => !existingReadIds.has(msg.id))
    .map(msg => ({
      message_id: msg.id,
      user_id: userId,
      read_at: new Date().toISOString(),
      organization_id: organizationId,
    }))

  if (newReads.length > 0) {
    const { error: insertError } = await supabase
      .from('chat_message_reads')
      .insert(newReads)

    if (insertError) throw insertError
  }
}

export const markMessageAsRead = async (
  messageId: string,
  userId: string,
  organizationId: string
): Promise<void> => {
  const { error } = await supabase
    .from('chat_message_reads')
    .upsert({
      message_id: messageId,
      user_id: userId,
      read_at: new Date().toISOString(),
      organization_id: organizationId,
    }, { 
      onConflict: 'message_id,user_id'
    })

  if (error) throw error
}

export const getReadReceiptText = (
  message: { read_by?: string[]; user_id: string },
  userId: string,
  channelMembers: Map<string, any>
): string => {
  if (!message.read_by || message.read_by.length === 0) {
    return 'Sent'
  }
  
  const readByOthers = message.read_by.filter(id => id !== userId)
  
  if (readByOthers.length === 0) {
    return 'Sent'
  } else if (readByOthers.length === 1) {
    const reader = channelMembers.get(readByOthers[0])
    return `Read by ${reader?.username || 'someone'}`
  } else if (readByOthers.length === 2) {
    const reader1 = channelMembers.get(readByOthers[0])
    const reader2 = channelMembers.get(readByOthers[1])
    return `Read by ${reader1?.username || 'someone'} and ${reader2?.username || 'someone'}`
  } else {
    return `Read by ${readByOthers.length} people`
  }
}