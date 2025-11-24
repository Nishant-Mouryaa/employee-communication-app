// services/channelService.ts
import { supabase } from '../lib/supabase'
import { Channel, ChannelMember, Profile } from '../types/chat'
import { DEFAULT_CHANNELS } from '../constants/chat'

export const fetchChannels = async (userId: string, organizationId: string): Promise<Channel[]> => {
  const { data: memberChannels, error } = await supabase
    .from('channel_members')
    .select(`
      channel_id,
      channels!inner(*)
    `)
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .eq('channels.organization_id', organizationId)
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
        .eq('organization_id', organizationId)
      
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
  channelIds: string[],
  organizationId: string
): Promise<Record<string, number>> => {
  const [readMessages, allMessages] = await Promise.all([
    supabase
      .from('chat_message_reads')
      .select('message_id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId),
    supabase
      .from('chat_messages')
      .select('id, channel_id, user_id')
      .in('channel_id', channelIds)
      .eq('organization_id', organizationId)
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

export const createDefaultChannels = async (userId: string, organizationId: string): Promise<void> => {
  try {
    const { data: existing } = await supabase
      .from('channels')
      .select('name')
      .eq('organization_id', organizationId)
      .in(
        'name',
        DEFAULT_CHANNELS.map(ch => ch.name)
      )

    const existingNames = new Set(existing?.map(ch => ch.name) || [])

    const channelsToInsert = DEFAULT_CHANNELS.filter(ch => !existingNames.has(ch.name)).map(ch => ({
      name: ch.name,
      description: ch.description,
      created_by: userId,
      organization_id: organizationId,
      type: 'channel',
    }))

    if (channelsToInsert.length === 0) return

    // Insert channels one by one to handle duplicate key errors gracefully
    for (const channel of channelsToInsert) {
      try {
        const { error } = await supabase.from('channels').insert([channel])
        if (error) {
          // If it's a duplicate key error, skip it (channel might exist from another org with same name)
          // This shouldn't happen if the unique constraint is per-org, but handle it anyway
          if (error.code === '23505') {
            console.warn(`Channel "${channel.name}" already exists, skipping...`)
            continue
          }
          throw error
        }
      } catch (err: any) {
        // Handle duplicate key errors gracefully
        if (err?.code === '23505') {
          console.warn(`Channel "${channel.name}" already exists, skipping...`)
          continue
        }
        throw err
      }
    }
  } catch (error) {
    // Log but don't throw - channel creation failure shouldn't block org creation
    console.warn('Error creating default channels:', error)
    // Don't rethrow - allow organization creation to succeed
  }
}

export const addUserToDefaultChannels = async (userId: string, organizationId: string): Promise<void> => {
  try {
    // Ensure default channels exist (this is idempotent)
    await createDefaultChannels(userId, organizationId)

    // Get all default channels for this organization
    const { data: channelsInOrg, error: fetchError } = await supabase
      .from('channels')
      .select('id, name')
      .eq('organization_id', organizationId)
      .in(
        'name',
        DEFAULT_CHANNELS.map(ch => ch.name)
      )

    if (fetchError) {
      console.warn('Error fetching channels for user:', fetchError)
      return
    }

    const channelMembers = (channelsInOrg || []).map(ch => ({
      channel_id: ch.id,
      user_id: userId,
      organization_id: organizationId,
    }))

    if (channelMembers.length === 0) {
      console.warn('No default channels found to add user to')
      return
    }

    const { error: upsertError } = await supabase
      .from('channel_members')
      .upsert(channelMembers, { onConflict: 'channel_id,user_id' })

    if (upsertError) {
      console.warn('Error adding user to default channels:', upsertError)
      // Don't throw - this is not critical
    }
  } catch (error) {
    // Log but don't throw - adding user to channels is not critical for org creation
    console.warn('Error in addUserToDefaultChannels (non-blocking):', error)
  }
}




export const fetchChannelMembers = async (
  channelId: string,
  organizationId: string
): Promise<Map<string, Profile>> => {
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
        position,
        status
      )
    `)
    .eq('channel_id', channelId)
    .eq('organization_id', organizationId)

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
        position: member.profiles.position,
        status: member.profiles.status
      }
      membersMap.set(member.user_id, profile)
    }
  })

  return membersMap
}
// Add a function to get detailed member info
export const fetchChannelMembersList = async (
  channelId: string,
  organizationId: string
): Promise<ChannelMember[]> => {
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
        position,
        status
      )
    `)
    .eq('channel_id', channelId)
    .eq('organization_id', organizationId)
    .order('joined_at', { ascending: true })

  if (error) throw error
  return data || []
}

