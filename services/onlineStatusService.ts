// services/onlineStatusService.ts
import { supabase } from '../lib/supabase'

// Track user online status
export const updateUserOnlineStatus = async (userId: string, isOnline: boolean) => {
  const { error } = await supabase
    .from('profiles')
    .update({
      is_online: isOnline,
      last_seen: isOnline ? new Date().toISOString() : undefined
    })
    .eq('id', userId)

  if (error) {
    console.error('Error updating online status:', error)
  }
}

// Get user's online status
export const getUserOnlineStatus = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('is_online, last_seen')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching online status:', error)
    return { is_online: false, last_seen: null }
  }

  return data
}

// Subscribe to online status changes
export const subscribeToOnlineStatus = (channelId: string, onStatusChange: (payload: any) => void) => {
  return supabase
    .channel(`online_status:${channelId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles'
      },
      onStatusChange
    )
    .subscribe()
}