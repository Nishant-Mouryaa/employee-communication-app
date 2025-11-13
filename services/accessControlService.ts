// services/accessControlService.ts
import { supabase } from '../lib/supabase'
import { UserRole, AccessPolicy, ChannelAccessControl } from '../types/security'
import { Profile } from '../types/chat'

export interface UserPermissions {
  role: UserRole
  department?: string
  can_message_cross_department: boolean
  can_message_external: boolean
  allowed_departments?: string[]
}

/**
 * Get user's role and permissions
 */
export const getUserPermissions = async (userId: string): Promise<UserPermissions> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, department')
      .eq('id', userId)
      .single()

    if (error) throw error

    // Get access policies
    const { data: policies } = await supabase
      .from('access_policies')
      .select('*')
      .eq('is_active', true)
      .single()

    const role = (profile?.role as UserRole) || 'employee'
    const department = profile?.department

    // Default permissions based on role
    const defaultPermissions: Record<UserRole, Partial<UserPermissions>> = {
      admin: {
        can_message_cross_department: true,
        can_message_external: true,
      },
      manager: {
        can_message_cross_department: true,
        can_message_external: false,
      },
      employee: {
        can_message_cross_department: policies?.allow_cross_department || false,
        can_message_external: false,
      },
      guest: {
        can_message_cross_department: false,
        can_message_external: false,
      },
    }

    return {
      role,
      department,
      ...defaultPermissions[role],
      allowed_departments: policies?.allowed_departments || undefined,
    }
  } catch (error) {
    console.error('Error fetching user permissions:', error)
    // Return restrictive defaults on error
    return {
      role: 'employee',
      can_message_cross_department: false,
      can_message_external: false,
    }
  }
}

/**
 * Check if user can message another user
 */
export const canMessageUser = async (
  senderId: string,
  recipientId: string
): Promise<{ allowed: boolean; reason?: string }> => {
  try {
    const [senderPerms, recipientProfile] = await Promise.all([
      getUserPermissions(senderId),
      supabase
        .from('profiles')
        .select('department, role')
        .eq('id', recipientId)
        .single(),
    ])

    if (recipientProfile.error || !recipientProfile.data) {
      return { allowed: false, reason: 'Recipient not found' }
    }

    const recipient = recipientProfile.data

    // Admins can message anyone
    if (senderPerms.role === 'admin') {
      return { allowed: true }
    }

    // Check department restrictions
    if (
      senderPerms.department &&
      recipient.department &&
      senderPerms.department !== recipient.department
    ) {
      if (!senderPerms.can_message_cross_department) {
        return {
          allowed: false,
          reason: 'Cross-department messaging not allowed',
        }
      }

      // Check if recipient department is in allowed list
      if (
        senderPerms.allowed_departments &&
        !senderPerms.allowed_departments.includes(recipient.department)
      ) {
        return {
          allowed: false,
          reason: 'Department not in allowed list',
        }
      }
    }

    // Check external messaging
    if (
      recipient.role === 'guest' &&
      !senderPerms.can_message_external
    ) {
      return { allowed: false, reason: 'External messaging not allowed' }
    }

    return { allowed: true }
  } catch (error) {
    console.error('Error checking message permissions:', error)
    return { allowed: false, reason: 'Permission check failed' }
  }
}

/**
 * Check if user can access a channel
 */
export const canAccessChannel = async (
  userId: string,
  channelId: string
): Promise<{ allowed: boolean; reason?: string }> => {
  try {
    const [userPerms, channelAccess] = await Promise.all([
      getUserPermissions(userId),
      supabase
        .from('channel_access_control')
        .select('*')
        .eq('channel_id', channelId)
        .single(),
    ])

    // If no access control, allow access
    if (channelAccess.error || !channelAccess.data) {
      return { allowed: true }
    }

    const access = channelAccess.data

    // Admins can access all channels
    if (userPerms.role === 'admin') {
      return { allowed: true }
    }

    // Check if channel is private
    if (access.is_private) {
      // Check department restrictions
      if (
        access.allowed_departments &&
        userPerms.department &&
        !access.allowed_departments.includes(userPerms.department)
      ) {
        return {
          allowed: false,
          reason: 'Your department does not have access to this channel',
        }
      }

      // Check role restrictions
      if (
        access.allowed_roles &&
        !access.allowed_roles.includes(userPerms.role)
      ) {
        return {
          allowed: false,
          reason: 'Your role does not have access to this channel',
        }
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('Error checking channel access:', error)
    return { allowed: false, reason: 'Access check failed' }
  }
}

/**
 * Check if user can create channels
 */
export const canCreateChannel = async (userId: string): Promise<boolean> => {
  const perms = await getUserPermissions(userId)
  return perms.role === 'admin' || perms.role === 'manager'
}

/**
 * Check if user can delete channels
 */
export const canDeleteChannel = async (userId: string, channelId: string): Promise<boolean> => {
  const perms = await getUserPermissions(userId)
  
  if (perms.role === 'admin') return true

  // Check if user created the channel
  const { data: channel } = await supabase
    .from('channels')
    .select('created_by')
    .eq('id', channelId)
    .single()

  return channel?.created_by === userId && perms.role === 'manager'
}

/**
 * Get access policy for organization
 */
export const getAccessPolicy = async (): Promise<AccessPolicy | null> => {
  try {
    const { data, error } = await supabase
      .from('access_policies')
      .select('*')
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching access policy:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getAccessPolicy:', error)
    return null
  }
}

