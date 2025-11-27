// services/invitationService.ts
import { supabase } from '../lib/supabase'

export interface Invitation {
  id: string
  organization_id: string
  email: string
  role: 'admin' | 'manager' | 'employee'
  invited_by: string
  token: string
  expires_at: string
  accepted_at?: string
  created_at: string
}

/**
 * Create an invitation for a new user
 */
export const createInvitation = async (
  email: string,
  role: 'admin' | 'manager' | 'employee',
  organizationId: string,
  invitedBy: string,
  department?: string,
  position?: string
): Promise<Invitation> => {
  try {
    // Generate a unique token
    const token = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15)

    // Set expiration to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Check if invitation already exists
    const { data: existing } = await supabase
      .from('invitations')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('organization_id', organizationId)
      .is('accepted_at', null)
      .single()

    if (existing) {
      throw new Error('An invitation for this email already exists')
    }

    // Create invitation
    const { data, error } = await supabase
      .from('invitations')
      .insert([
        {
          organization_id: organizationId,
          email: email.toLowerCase(),
          role,
          invited_by: invitedBy,
          token,
          expires_at: expiresAt.toISOString(),
          metadata: {
            department,
            position,
          },
        },
      ])
      .select()
      .single()

    if (error) throw error

    // TODO: Send invitation email
    // You can use a service like SendGrid, AWS SES, or Supabase Edge Functions
    console.log(`Invitation created for ${email}. Token: ${token}`)
    console.log(`Share this link: yourapp://invite/${token}`)

    return data
  } catch (error) {
    console.error('Error creating invitation:', error)
    throw error
  }
}

/**
 * Accept an invitation and join organization
 */
export const acceptInvitation = async (
  token: string,
  userId: string
): Promise<{ success: boolean; organizationId: string }> => {
  try {
    // Find invitation
    const { data: invitation, error: findError } = await supabase
      .from('invitations')
      .select('*, organizations(*)')
      .eq('token', token)
      .is('accepted_at', null)
      .single()

    if (findError || !invitation) {
      throw new Error('Invalid or expired invitation')
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('This invitation has expired')
    }

    // Get user's current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      throw new Error('User profile not found')
    }

    // Check if user already has an organization
    if (profile.organization_id) {
      throw new Error('You already belong to an organization')
    }

    // Update user profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        organization_id: invitation.organization_id,
        role: invitation.role,
        department: invitation.metadata?.department || null,
        position: invitation.metadata?.position || null,
      })
      .eq('id', userId)

    if (updateError) throw updateError

    // Mark invitation as accepted
    await supabase
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    // Add user to default channels
    try {
      const { addUserToDefaultChannels } = await import('./channelService')
      await addUserToDefaultChannels(userId, invitation.organization_id)
    } catch (channelError) {
      console.warn('Error adding to default channels:', channelError)
    }

    return {
      success: true,
      organizationId: invitation.organization_id,
    }
  } catch (error) {
    console.error('Error accepting invitation:', error)
    throw error
  }
}

/**
 * Get all pending invitations for an organization
 */
export const getOrganizationInvitations = async (
  organizationId: string
): Promise<Invitation[]> => {
  try {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return []
  }
}

/**
 * Cancel/delete an invitation
 */
export const cancelInvitation = async (invitationId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId)

    if (error) throw error
  } catch (error) {
    console.error('Error canceling invitation:', error)
    throw error
  }
}