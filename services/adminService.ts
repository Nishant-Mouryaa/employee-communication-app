// services/adminService.ts
import { supabase } from '../lib/supabase'
import { Channel, Profile } from '../types/chat'
import { UserRole, AccessPolicy, ComplianceSettings } from '../types/security'
import { logAuditEvent } from './complianceService'

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
export const createChannel = async (
  name: string,
  description: string,
  createdBy: string,
  options?: {
    isPrivate?: boolean
    allowedDepartments?: string[]
    allowedRoles?: UserRole[]
  }
): Promise<Channel> => {
  try {
    // Verify user can create channels
    const admin = await isAdmin(createdBy)
    if (!admin) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', createdBy)
        .single()

      if (profile?.role !== 'manager') {
        throw new Error('Only admins and managers can create channels')
      }
    }

    // Create channel
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .insert([
        {
          name,
          description,
          created_by: createdBy,
          type: 'channel',
        },
      ])
      .select()
      .single()

    if (channelError) throw channelError

    // Create access control if specified
    if (options?.isPrivate || options?.allowedDepartments || options?.allowedRoles) {
      await supabase.from('channel_access_control').insert([
        {
          channel_id: channel.id,
          is_private: options.isPrivate || false,
          allowed_departments: options.allowedDepartments,
          allowed_roles: options.allowedRoles,
          requires_approval: false,
          created_by: createdBy,
        },
      ])
    }

    // Add creator as member
    await supabase.from('channel_members').insert([
      {
        channel_id: channel.id,
        user_id: createdBy,
      },
    ])

    // Log audit event
    await logAuditEvent({
      user_id: createdBy,
      action: 'channel_created',
      resource_type: 'channel',
      resource_id: channel.id,
      details: { name, description, options },
    })

    return {
      ...channel,
      unread_count: 0,
      member_count: 1,
    }
  } catch (error) {
    console.error('Error creating channel:', error)
    throw error
  }
}

/**
 * Delete a channel (admin only, or manager who created it)
 */
export const deleteChannel = async (
  channelId: string,
  deletedBy: string
): Promise<void> => {
  try {
    const admin = await isAdmin(deletedBy)

    if (!admin) {
      // Check if user created the channel
      const { data: channel } = await supabase
        .from('channels')
        .select('created_by')
        .eq('id', channelId)
        .single()

      if (channel?.created_by !== deletedBy) {
        throw new Error('Only channel creator or admin can delete channels')
      }
    }

    // Delete in order
    await Promise.all([
      supabase.from('channel_access_control').delete().eq('channel_id', channelId),
      supabase.from('channel_members').delete().eq('channel_id', channelId),
      supabase.from('chat_messages').delete().eq('channel_id', channelId),
      supabase.from('channels').delete().eq('id', channelId),
    ])

    await logAuditEvent({
      user_id: deletedBy,
      action: 'channel_deleted',
      resource_type: 'channel',
      resource_id: channelId,
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
  updatedBy: string
): Promise<void> => {
  try {
    if (!(await isAdmin(updatedBy))) {
      throw new Error('Only admins can update user roles')
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) throw error

    await logAuditEvent({
      user_id: updatedBy,
      action: 'user_role_updated',
      resource_type: 'user',
      resource_id: userId,
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
export const getAllUsers = async (): Promise<Profile[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
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
  createdBy: string
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
  addedBy: string
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
  removedBy: string
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
      .in('user_id', userIds)

    if (error) throw error

    await logAuditEvent({
      user_id: removedBy,
      action: 'users_removed_from_channel',
      resource_type: 'channel',
      resource_id: channelId,
      details: { user_ids: userIds },
    })
  } catch (error) {
    console.error('Error removing users from channel:', error)
    throw error
  }
}

