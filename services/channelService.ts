// services/channelService.ts
import { supabase } from '../lib/supabase'
import { Channel, ChannelMember } from '../types/chat'
import { DEFAULT_CHANNELS } from '../constants/chat'

export const fetchChannels = async (userId: string): Promise<Channel[]> => {
  const { data: memberChannels, error } = await supabase
    .from('channel_members')
    .select(`
      channel_id,
      channels!inner(*)
    `)
    .eq('user_id', userId)
    .neq('channels.type', 'direct')

  if (error) throw error

  const channels = memberChannels?.map(mc => mc.channels) || []
  
  // Fetch member counts for each channel
  const channelsWithCounts = await Promise.all(
    channels.map(async (channel) => {
      const { count } = await supabase
        .from('channel_members')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', channel.id)
      
      return {
        ...channel,
        member_count: count || 0
      }
    })
  )

  return channelsWithCounts
}

export const fetchChannelUnreadCounts = async (
  userId: string,
  channelIds: string[]
): Promise<Record<string, number>> => {
  const [readMessages, allMessages] = await Promise.all([
    supabase
      .from('chat_message_reads')
      .select('message_id')
      .eq('user_id', userId),
    supabase
      .from('chat_messages')
      .select('id, channel_id, user_id')
      .in('channel_id', channelIds)
      .neq('user_id', userId)
  ])

  const readMessageIds = new Set(
    readMessages.data?.map(msg => msg.message_id) || []
  )

  return (allMessages.data || []).reduce((acc, msg) => {
    if (!readMessageIds.has(msg.id)) {
      acc[msg.channel_id] = (acc[msg.channel_id] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)
}

export const createDefaultChannels = async (userId: string): Promise<void> => {
  const channelsWithUser = DEFAULT_CHANNELS.map(ch => ({
    ...ch,
    created_by: userId
  }))

  const { error } = await supabase
    .from('channels')
    .upsert(channelsWithUser, { onConflict: 'id' })

  if (error) throw error
}

export const addUserToDefaultChannels = async (userId: string): Promise<void> => {
  await createDefaultChannels(userId)
  
  const channelMembers = DEFAULT_CHANNELS.map(ch => ({
    channel_id: ch.id,
    user_id: userId
  }))

  const { error } = await supabase
    .from('channel_members')
    .upsert(channelMembers, { onConflict: 'channel_id,user_id' })

  if (error) throw error
}




export const fetchChannelMembers = async (channelId: string): Promise<Map<string, Profile>> => {
  const { data, error } = await supabase
    .from('channel_members')
    .select(`
      user_id,
      profiles!inner (
        id,
        username,
        full_name,
        avatar_url,
        last_seen,
        is_online,
        department,
        position
      )
    `)
    .eq('channel_id', channelId)

  if (error) throw error

  const membersMap = new Map<string, Profile>()
  
  data?.forEach(member => {
    if (member.profiles) {
      // Ensure we have a proper profile object with all fields
      const profile: Profile = {
        id: member.profiles.id || member.user_id,
        username: member.profiles.username || 'unknown',
        full_name: member.profiles.full_name || member.profiles.username || 'Unknown User',
        avatar_url: member.profiles.avatar_url,
        last_seen: member.profiles.last_seen,
        is_online: member.profiles.is_online,
        department: member.profiles.department,
        position: member.profiles.position
      }
      membersMap.set(member.user_id, profile)
    }
  })

  return membersMap
}
// Add a function to get detailed member info
export const fetchChannelMembersList = async (channelId: string): Promise<ChannelMember[]> => {
  const { data, error } = await supabase
    .from('channel_members')
    .select(`
      user_id,
      channel_id,
      joined_at,
      profiles!inner (
        id,
        username,
        full_name,
        avatar_url,
        last_seen,
        is_online,
        department,
        position
      )
    `)
    .eq('channel_id', channelId)
    .order('joined_at', { ascending: true })

  if (error) throw error
  return data || []
}

