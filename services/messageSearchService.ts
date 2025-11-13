// services/messageSearchService.ts
import { supabase } from '../lib/supabase'
import { Message } from '../types/chat'

export interface SearchFilters {
  query?: string
  channelId?: string
  userId?: string
  hasAttachments?: boolean
  mentionsMe?: boolean
  dateFrom?: string
  dateTo?: string
}

/**
 * Search messages across channels or within a specific channel
 */
export const searchMessages = async (
  filters: SearchFilters,
  userId: string,
  limit: number = 50
): Promise<Message[]> => {
  try {
    let query = supabase
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
        ),
        channels (
          id,
          name,
          type
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Text search in content
    if (filters.query) {
      query = query.ilike('content', `%${filters.query}%`)
    }

    // Filter by channel
    if (filters.channelId) {
      query = query.eq('channel_id', filters.channelId)
    }

    // Filter by user
    if (filters.userId) {
      query = query.eq('user_id', filters.userId)
    }

    // Filter by attachments
    if (filters.hasAttachments) {
      query = query.not('attachments', 'is', null)
    }

    // Filter by mentions
    if (filters.mentionsMe) {
      query = query.contains('mentions', [userId])
    }

    // Date range filters
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    const { data, error } = await query

    if (error) throw error

    return (data || []).map((msg: any) => ({
      ...msg,
      attachments: msg.attachments || [],
    }))
  } catch (error) {
    console.error('Error searching messages:', error)
    return []
  }
}

/**
 * Search for messages with attachments
 */
export const searchAttachments = async (
  channelId: string,
  query?: string,
  limit: number = 50
): Promise<Message[]> => {
  try {
    let searchQuery = supabase
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
      .not('attachments', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    // If query provided, search in attachment names
    if (query) {
      // Note: This searches in message content, not attachment names directly
      // For better results, you might want to store attachment metadata separately
      searchQuery = searchQuery.ilike('content', `%${query}%`)
    }

    const { data, error } = await searchQuery

    if (error) throw error

    return (data || []).map((msg: any) => ({
      ...msg,
      attachments: msg.attachments || [],
    }))
  } catch (error) {
    console.error('Error searching attachments:', error)
    return []
  }
}

/**
 * Get messages that mention the user
 */
export const getMentionedMessages = async (
  userId: string,
  channelId?: string,
  limit: number = 50
): Promise<Message[]> => {
  try {
    let query = supabase
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
        ),
        channels (
          id,
          name,
          type
        )
      `)
      .contains('mentions', [userId])
      .order('created_at', { ascending: false })
      .limit(limit)

    if (channelId) {
      query = query.eq('channel_id', channelId)
    }

    const { data, error } = await query

    if (error) throw error

    return (data || []).map((msg: any) => ({
      ...msg,
      attachments: msg.attachments || [],
    }))
  } catch (error) {
    console.error('Error fetching mentioned messages:', error)
    return []
  }
}

