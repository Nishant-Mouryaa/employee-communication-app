// services/reactionService.ts
import { supabase } from '../lib/supabase'


export const addReaction = async (messageId: string, emoji: string, userId: string) => {
  try {
    // First, verify the message exists in chat_messages table
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('id', messageId)
      .single()

    if (messageError || !message) {
      throw new Error('Message not found')
    }

    // Check if reaction already exists
    const { data: existingReaction } = await supabase
      .from('reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .single()

    if (existingReaction) {
      // If reaction exists, remove it (toggle behavior)
      await removeReaction(existingReaction.id)
      return null
    }

    // Add new reaction
    const { data, error } = await supabase
      .from('reactions')
      .insert({
        message_id: messageId,
        user_id: userId,
        emoji: emoji,
      })
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error adding reaction:', error)
    throw error
  }
}

export const removeReaction = async (reactionId: string) => {
  const { error } = await supabase
    .from('reactions')
    .delete()
    .eq('id', reactionId)

  if (error) throw error
}

export const getMessageReactions = async (messageId: string) => {
  try {
    const { data: reactions, error } = await supabase
      .from('reactions')
      .select('*')
      .eq('message_id', messageId)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Fetch profiles for each reaction
    const reactionsWithProfiles = await Promise.all(
      (reactions || []).map(async (reaction) => {
        return await getReactionWithProfile(reaction)
      })
    )

    return reactionsWithProfiles
  } catch (error) {
    console.error('Error fetching reactions:', error)
    return []
  }
}

export const getReactionWithProfile = async (reaction: any) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', reaction.user_id)
      .single()

    if (error) {
      console.warn('Profile not found for user:', reaction.user_id)
      return {
        ...reaction,
        profiles: {
          id: reaction.user_id,
          username: 'unknown',
          full_name: 'Unknown User'
        }
      }
    }

    return {
      ...reaction,
      profiles: profile
    }
  } catch (error) {
    console.error('Error fetching reaction profile:', error)
    return {
      ...reaction,
      profiles: {
        id: reaction.user_id,
        username: 'unknown',
        full_name: 'Unknown User'
      }
    }
  }
}

export const verifyMessageExists = async (messageId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('id', messageId)
      .single()

    return !error && !!data
  } catch (error) {
    return false
  }
}