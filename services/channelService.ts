// services/channelService.ts
import { supabase } from '../lib/supabase'
import { Channel } from '../types/chat'
import { DEFAULT_CHANNELS } from '../constants/chat'

export const fetchChannels = async (userId: string): Promise<Channel[]> => {
  const { data: memberData, error: memberError } = await supabase
    .from('channel_members')
    .select('channel_id')
    .eq('user_id', userId)

  if (memberError) throw memberError

  if (!memberData || memberData.length === 0) {
    return []
  }

  const channelIds = memberData.map(member => member.channel_id)
  
  const { data: channelsData, error: channelsError } = await supabase
    .from('channels')
    .select('*')
    .in('id', channelIds)
    .order('name')

  if (channelsError) throw channelsError

  return channelsData || []
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

export const fetchChannelMembers = async (channelId: string) => {
  const { data, error } = await supabase
    .from('channel_members')
    .select(`
      user_id,
      profiles!inner (
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq('channel_id', channelId)

  if (error) throw error

  const membersMap = new Map()
  data?.forEach(member => {
    if (member.profiles) {
      membersMap.set(member.user_id, member.profiles)
    }
  })
  
  return membersMap
}