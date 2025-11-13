// services/messagePinService.ts
import { supabase } from '../lib/supabase'
import { Message } from '../types/chat'

/**
 * Pin a message in a channel (admin/manager only)
 */
export const pinMessage = async (
  messageId: string,
  channelId: string,
  pinnedBy: string
): Promise<void> => {
  try {
    // Check if user has permission (admin or manager)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', pinnedBy)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
      throw new Error('Only admins and managers can pin messages')
    }

    // Unpin any existing pinned message in the channel
    await supabase
      .from('chat_messages')
      .update({ is_pinned: false, pinned_by: null, pinned_at: null })
      .eq('channel_id', channelId)
      .eq('is_pinned', true)

    // Pin the new message
    const { error } = await supabase
      .from('chat_messages')
      .update({
        is_pinned: true,
        pinned_by: pinnedBy,
        pinned_at: new Date().toISOString(),
      })
      .eq('id', messageId)

    if (error) throw error
  } catch (error) {
    console.error('Error pinning message:', error)
    throw error
  }
}

/**
 * Unpin a message
 */
export const unpinMessage = async (messageId: string, unpinnedBy: string): Promise<void> => {
  try {
    // Check if user has permission
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', unpinnedBy)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
      throw new Error('Only admins and managers can unpin messages')
    }

    const { error } = await supabase
      .from('chat_messages')
      .update({
        is_pinned: false,
        pinned_by: null,
        pinned_at: null,
      })
      .eq('id', messageId)

    if (error) throw error
  } catch (error) {
    console.error('Error unpinning message:', error)
    throw error
  }
}

/**
 * Get pinned message for a channel
 */
export const getPinnedMessage = async (channelId: string): Promise<Message | null> => {
  try {
    const { data, error } = await supabase
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
      .eq('is_pinned', true)
      .order('pinned_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // No pinned message
      throw error
    }

    return data
  } catch (error) {
    console.error('Error fetching pinned message:', error)
    return null
  }
}

