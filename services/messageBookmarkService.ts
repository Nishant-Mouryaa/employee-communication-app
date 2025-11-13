// services/messageBookmarkService.ts
import { supabase } from '../lib/supabase'
import { Message } from '../types/chat'

/**
 * Star/save a message for personal reference
 */
export const starMessage = async (messageId: string, userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('message_bookmarks')
      .upsert(
        {
          message_id: messageId,
          user_id: userId,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'message_id,user_id' }
      )

    if (error) throw error
  } catch (error) {
    console.error('Error starring message:', error)
    throw error
  }
}

/**
 * Unstar a message
 */
export const unstarMessage = async (messageId: string, userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('message_bookmarks')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)

    if (error) throw error
  } catch (error) {
    console.error('Error unstarring message:', error)
    throw error
  }
}

/**
 * Get all starred messages for a user
 */
export const getStarredMessages = async (userId: string): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from('message_bookmarks')
      .select(`
        message_id,
        chat_messages!inner (
          *,
          profiles (
            id,
            username,
            full_name,
            avatar_url,
            department,
            position
          ),
          channels (
            id,
            name,
            type
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map((bookmark: any) => ({
      ...bookmark.chat_messages,
      is_starred: true,
    }))
  } catch (error) {
    console.error('Error fetching starred messages:', error)
    return []
  }
}

/**
 * Check if a message is starred by user
 */
export const isMessageStarred = async (messageId: string, userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('message_bookmarks')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
    return !!data
  } catch (error) {
    console.error('Error checking if message is starred:', error)
    return false
  }
}

