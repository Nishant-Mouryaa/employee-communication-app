// services/directMessageService.ts
import { supabase } from '../lib/supabase'
import { Channel, Profile } from '../types/chat'

export const createOrGetDirectMessageChannel = async (
  currentUserId: string,
  targetUserId: string,
  targetProfile: Profile,
  organizationId: string
): Promise<Channel> => {
  console.log('=== createOrGetDirectMessageChannel ===')
  
  // Check if user can message target user
  const { canMessageUser } = await import('./accessControlService')
  const permissionCheck = await canMessageUser(currentUserId, targetUserId)
  
  if (!permissionCheck.allowed) {
    throw new Error(permissionCheck.reason || 'You do not have permission to message this user')
  }
  console.log('Current User ID:', currentUserId)
  console.log('Target User ID:', targetUserId)
  
  try {
    // Create a consistent channel name for DMs (ALWAYS sort the IDs)
    const userIds = [currentUserId, targetUserId].sort()
    const dmChannelName = `dm_${userIds[0]}_${userIds[1]}`
    console.log('DM Channel Name:', dmChannelName)
    
    // IMPORTANT: Check if DM channel already exists by name (not by type)
    // This ensures we find channels even if they don't have type='direct' yet
    const { data: existingChannels, error: searchError } = await supabase
      .from('channels')
      .select('*')
      .eq('name', dmChannelName)
      .eq('organization_id', organizationId)
      .limit(1)
    
    console.log('Search result:', existingChannels)
    console.log('Search error:', searchError)
    
    if (searchError) {
      console.error('Error searching for existing channel:', searchError)
      throw searchError
    }
    
    // If we found an existing channel, return it
    if (existingChannels && existingChannels.length > 0) {
      console.log('Found existing DM channel:', existingChannels[0])
      const channel = existingChannels[0]
      
      // Update the type to 'direct' if it isn't already
      if (channel.type !== 'direct') {
        console.log('Updating channel type to direct')
        await supabase
          .from('channels')
          .update({ type: 'direct' })
          .eq('id', channel.id)
      }
      
      // Ensure both users are members (in case one was removed)
      const { data: existingMembers } = await supabase
        .from('channel_members')
        .select('user_id')
        .eq('channel_id', channel.id)
        .eq('organization_id', organizationId)
      
      const memberIds = new Set(existingMembers?.map(m => m.user_id) || [])
      const membersToAdd = []
      
      if (!memberIds.has(currentUserId)) {
        membersToAdd.push({ channel_id: channel.id, user_id: currentUserId, organization_id: organizationId })
      }
      if (!memberIds.has(targetUserId)) {
        membersToAdd.push({ channel_id: channel.id, user_id: targetUserId, organization_id: organizationId })
      }
      
      if (membersToAdd.length > 0) {
        console.log('Adding missing members:', membersToAdd)
        await supabase
          .from('channel_members')
          .insert(membersToAdd)
      }
      
      return {
        ...channel,
        type: 'direct',
        dm_user: targetProfile,
        unread_count: 0
      }
    }

    console.log('Creating new DM channel...')
    
    // Create new DM channel
    const { data: newChannel, error: createError } = await supabase
      .from('channels')
      .insert([
        {
          name: dmChannelName,
          description: `Direct message with ${targetProfile.full_name || targetProfile.username}`,
          type: 'direct',
          organization_id: organizationId,
        }
      ])
      .select()
      .single()

    if (createError) {
      console.error('Error creating DM channel:', createError)
      
      // If it's a unique constraint error, the channel was just created by the other user
      // Try to fetch it again
      if (createError.code === '23505') { // Unique constraint violation
        console.log('Channel was just created by other user, fetching it...')
        const { data: justCreatedChannel } = await supabase
          .from('channels')
          .select('*')
          .eq('name', dmChannelName)
          .eq('organization_id', organizationId)
          .single()
        
        if (justCreatedChannel) {
          // Add current user as member
          await supabase
            .from('channel_members')
            .insert([{ channel_id: justCreatedChannel.id, user_id: currentUserId, organization_id: organizationId }])
            .select()
          
          return {
            ...justCreatedChannel,
            type: 'direct',
            dm_user: targetProfile,
            unread_count: 0
          }
        }
      }
      
      throw createError
    }

    console.log('New channel created:', newChannel)

    // Add both users as members
    const { error: memberError } = await supabase
      .from('channel_members')
      .insert([
        { channel_id: newChannel.id, user_id: currentUserId, organization_id: organizationId },
        { channel_id: newChannel.id, user_id: targetUserId, organization_id: organizationId }
      ])

    if (memberError) {
      console.error('Error adding members:', memberError)
      // Don't throw on duplicate member errors
      if (!memberError.message?.includes('duplicate') && !memberError.message?.includes('unique')) {
        throw memberError
      }
    }

    return {
      ...newChannel,
      type: 'direct',
      dm_user: targetProfile,
      unread_count: 0
    }
  } catch (error) {
    console.error('Fatal error in createOrGetDirectMessageChannel:', error)
    throw error
  }
}

export const fetchDirectMessageChannels = async (
  userId: string,
  organizationId: string
): Promise<Channel[]> => {
  console.log('=== fetchDirectMessageChannels ===')
  console.log('User ID:', userId)
  
  try {
    // Get all channels where:
    // 1. User is a member
    // 2. Channel name matches dm_ pattern OR type is 'direct'
    const { data: memberChannels, error: memberError } = await supabase
      .from('channel_members')
      .select(`
        channel_id,
        channels!inner(*)
      `)
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('channels.organization_id', organizationId)
    
    if (memberError) {
      console.error('Error fetching member channels:', memberError)
      return []
    }

    if (!memberChannels || memberChannels.length === 0) {
      return []
    }

    // Filter for DM channels only
    const dmChannels = memberChannels
      .map(mc => mc.channels)
      .filter(channel => 
        channel.type === 'direct' || 
        channel.name.startsWith('dm_')
      )

    console.log('Found DM channels:', dmChannels.length)

    // Remove duplicates by ID
    const uniqueChannels = Array.from(
      new Map(dmChannels.map(ch => [ch.id, ch])).values()
    )

    // For each DM channel, get the other user's profile
    const dmChannelsWithProfiles = await Promise.all(
      uniqueChannels.map(async (channel) => {
        // Extract user IDs from channel name
        const match = channel.name.match(/dm_([^_]+)_([^_]+)/)
        if (!match) {
          console.log('Channel name does not match DM pattern:', channel.name)
          return null
        }
        
        const [_, userId1, userId2] = match
        const otherUserId = userId1 === userId ? userId2 : userId1
        
        console.log('Other user ID for channel', channel.id, ':', otherUserId)

        // Fetch the other user's profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherUserId)
          .single()

        if (profileError) {
          console.error('Error fetching profile for user:', otherUserId, profileError)
          return null
        }

        return {
          ...channel,
          type: 'direct' as const,
          dm_user: profile,
          unread_count: 0
        }
      })
    )

    // Filter out null values
    const validChannels = dmChannelsWithProfiles.filter(ch => ch !== null) as Channel[]
    console.log('Returning DM channels:', validChannels.length)
    return validChannels
  } catch (error) {
    console.error('Fatal error in fetchDirectMessageChannels:', error)
    return []
  }
}