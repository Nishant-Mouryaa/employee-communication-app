// services/adminService.ts
import { supabase } from '../lib/supabase'
import { Channel, Profile } from '../types/chat'
import { UserRole, AccessPolicy, ComplianceSettings } from '../types/security'
import { logAuditEvent } from './complianceService'
import { safeLogAuditEvent } from './complianceService'

/**
 * Check if user is admin
 */
export const isAdmin = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error) return false
    return data?.role === 'admin'
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

/**
 * Create a new channel (admin/manager only)
 */

// services/adminService.ts

// services/adminService.ts

export const createChannel = async (
  name: string,
  description: string,
  createdBy: string,
  organizationId: string,
  options: {
    isPrivate?: boolean
    department?: string
  } = {}
): Promise<Channel> => {
  try {
    if (!organizationId) {
      throw new Error('Organization ID is required to create a channel')
    }

    console.log('🏗️ [CREATE_CHANNEL] Starting with:', {
      name,
      createdBy,
      organizationId,
    })

    // Create channel
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .insert([
        {
          name,
          description,
          created_by: createdBy,
          organization_id: organizationId,
          is_private: options.isPrivate || false,
          department: options.department || null,
        },
      ])
      .select()
      .single()

    if (channelError) {
      console.error('❌ [CREATE_CHANNEL] Channel insert error:', channelError)
      throw channelError
    }

    console.log('✅ [CREATE_CHANNEL] Channel created:', channel.id)

    // Add creator as member
    const { error: memberError } = await supabase
      .from('channel_members')
      .insert([
        {
          channel_id: channel.id,
          user_id: createdBy,
          role: 'admin',
          organization_id: organizationId,
        },
      ])

    if (memberError) {
      console.error('❌ [CREATE_CHANNEL] Failed to add member, rolling back')
      await supabase.from('channels').delete().eq('id', channel.id)
      throw memberError
    }

    console.log('✅ [CREATE_CHANNEL] Member added')

    // REMOVE the explicit audit log call since the trigger handles it
    // The database trigger log_channel_creation() will automatically create the audit log

    return channel
  } catch (error) {
    console.error('💥 [CREATE_CHANNEL] Error:', error)
    throw error
  }
}
/**
 * Delete a channel (admin only, or manager who created it)
 */
export const deleteChannel = async (
  channelId: string,
  deletedBy: string,
  organizationId: string
): Promise<void> => {
  try {
    const admin = await isAdmin(deletedBy)

    if (!admin) {
      // Check if user created the channel
      const { data: channel } = await supabase
        .from('channels')
        .select('created_by')
        .eq('id', channelId)
        .eq('organization_id', organizationId)
        .single()

      if (channel?.created_by !== deletedBy) {
        throw new Error('Only channel creator or admin can delete channels')
      }
    }

    // Delete in order
    await Promise.all([
      supabase.from('channel_access_control').delete().eq('channel_id', channelId).eq('organization_id', organizationId),
      supabase.from('channel_members').delete().eq('channel_id', channelId).eq('organization_id', organizationId),
      supabase.from('chat_messages').delete().eq('channel_id', channelId).eq('organization_id', organizationId),
      supabase.from('channels').delete().eq('id', channelId).eq('organization_id', organizationId),
    ])

    await safeLogAuditEvent({
      user_id: deletedBy,
      action: 'channel_deleted',
      resource_type: 'channel',
      resource_id: channelId,
      organization_id: organizationId,
    })
  } catch (error) {
    console.error('Error deleting channel:', error)
    throw error
  }
}

/**
 * Update user role (admin only)
 */
export const updateUserRole = async (
  userId: string,
  newRole: UserRole,
  updatedBy: string,
  organizationId: string
): Promise<void> => {
  try {
    if (!(await isAdmin(updatedBy))) {
      throw new Error('Only admins can update user roles')
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
      .eq('organization_id', organizationId)

    if (error) throw error

    await safeLogAuditEvent({
      user_id: updatedBy,
      action: 'user_role_updated',
      resource_type: 'user',
      resource_id: userId,
      organization_id: organizationId,
      details: { new_role: newRole },
    })
  } catch (error) {
    console.error('Error updating user role:', error)
    throw error
  }
}

/**
 * Get all users (admin only)
 */
export const getAllUsers = async (organizationId: string): Promise<Profile[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching users:', error)
    return []
  }
}

/**
 * Create or update access policy (admin only)
 */
export const upsertAccessPolicy = async (
  policy: Partial<AccessPolicy>,
  createdBy: string,
  organizationId: string
): Promise<AccessPolicy> => {
  try {
    if (!(await isAdmin(createdBy))) {
      throw new Error('Only admins can manage access policies')
    }

    const { data, error } = await supabase
      .from('access_policies')
      .upsert(
        {
          ...policy,
          is_active: true,
          updated_at: new Date().toISOString(),
          organization_id: organizationId,
        },
        { onConflict: 'id' }
      )
      .select()
      .single()

    if (error) throw error

    await logAuditEvent({
      user_id: createdBy,
      action: 'access_policy_updated',
      resource_type: 'policy',
      resource_id: data.id,
      organization_id: organizationId,
      details: policy,
    })

    return data
  } catch (error) {
    console.error('Error upserting access policy:', error)
    throw error
  }
}

/**
 * Add users to channel (admin/manager only)
 */
export const addUsersToChannel = async (
  channelId: string,
  userIds: string[],
  addedBy: string,
  organizationId: string
): Promise<void> => {
  try {
    const admin = await isAdmin(addedBy)
    if (!admin) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', addedBy)
        .single()

      if (profile?.role !== 'manager') {
        throw new Error('Only admins and managers can add users to channels')
      }
    }

    const members = userIds.map(userId => ({
      channel_id: channelId,
      user_id: userId,
      organization_id: organizationId,
    }))

    const { error } = await supabase
      .from('channel_members')
      .upsert(members, { onConflict: 'channel_id,user_id' })

    if (error) throw error

    await logAuditEvent({
      user_id: addedBy,
      action: 'users_added_to_channel',
      resource_type: 'channel',
      resource_id: channelId,
      organization_id: organizationId,
      details: { user_ids: userIds },
    })
  } catch (error) {
    console.error('Error adding users to channel:', error)
    throw error
  }
}

/**
 * Remove users from channel (admin/manager only)
 */
export const removeUsersFromChannel = async (
  channelId: string,
  userIds: string[],
  removedBy: string,
  organizationId: string
): Promise<void> => {
  try {
    const admin = await isAdmin(removedBy)
    if (!admin) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', removedBy)
        .single()

      if (profile?.role !== 'manager') {
        throw new Error('Only admins and managers can remove users from channels')
      }
    }

    const { error } = await supabase
      .from('channel_members')
      .delete()
      .eq('channel_id', channelId)
      .eq('organization_id', organizationId)
      .in('user_id', userIds)

    if (error) throw error

    await logAuditEvent({
      user_id: removedBy,
      action: 'users_removed_from_channel',
      resource_type: 'channel',
      resource_id: channelId,
      organization_id: organizationId,
      details: { user_ids: userIds },
    })
  } catch (error) {
    console.error('Error removing users from channel:', error)
    throw error
  }
}

/**
 * Get current access policy (admin only)
 */
export const getAccessPolicy = async (organizationId: string): Promise<AccessPolicy | null> => {
  try {
    const { data, error } = await supabase
      .from('access_policies')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null
      }
      throw error
    }

    return data
  } catch (error) {
    console.error('Error fetching access policy:', error)
    return null
  }
}
