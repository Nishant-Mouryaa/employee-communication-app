// services/typingService.ts
import { supabase } from '../lib/supabase'

export const updateTypingIndicator = async (
  channelId: string,
  userId: string
): Promise<void> => {
  await supabase
    .from('typing_indicators')
    .upsert({
      channel_id: channelId,
      user_id: userId,
      last_typed: new Date().toISOString()
    }, {
      onConflict: 'channel_id,user_id'
    })
}

export const clearTypingIndicator = async (
  channelId: string,
  userId: string
): Promise<void> => {
  await supabase
    .from('typing_indicators')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_id', userId)
}