// services/organizationService.ts
import { supabase } from '../lib/supabase'
import { Organization } from '../types/organization'
import { createDefaultChannels, addUserToDefaultChannels } from './channelService'

export interface CreateOrganizationData {
  name: string
  slug?: string
  plan?: string
}

export interface AddUserData {
  email: string
  username: string
  full_name: string
  department?: string
  position?: string
  role?: 'admin' | 'manager' | 'employee'
}

/**
 * Create a new organization and set the creator as admin
 */
export const createOrganization = async (
  data: CreateOrganizationData,
  creatorUserId: string
): Promise<Organization> => {
  try {
    // Generate slug from name if not provided
    const slug = data.slug || data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    // Check if slug already exists
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingOrg) {
      throw new Error('An organization with this name already exists. Please choose a different name.')
    }

    // Create organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert([
        {
          name: data.name,
          slug: slug,
          plan: data.plan || 'free',
          is_active: true,
        },
      ])
      .select()
      .single()

    if (orgError) throw orgError

    // Update creator's profile to belong to this organization and set as admin
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        organization_id: organization.id,
        role: 'admin',
      })
      .eq('id', creatorUserId)

    if (profileError) {
      // Rollback organization creation
      await supabase.from('organizations').delete().eq('id', organization.id)
      throw profileError
    }

    // Create default channels for the organization
    // Note: Errors are handled inside createDefaultChannels, so we don't need try-catch here
    // Run these in parallel and don't wait - they're not critical for org creation
    Promise.all([
      createDefaultChannels(creatorUserId, organization.id).catch(err => {
        console.warn('Error creating default channels (non-blocking):', err)
      }),
      addUserToDefaultChannels(creatorUserId, organization.id).catch(err => {
        console.warn('Error adding user to default channels (non-blocking):', err)
      })
    ]).catch(err => {
      console.warn('Error in channel setup (non-blocking):', err)
    })

    return organization
  } catch (error) {
    console.error('Error creating organization:', error)
    throw error
  }
}

/**
 * Add a new user to the organization
 * Note: This function creates a profile for existing users or prepares data for new users.
 * For creating new auth users, you'll need a serverless function with admin privileges.
 * For now, we'll create a profile placeholder that can be linked when the user signs up.
 */
export const addUserToOrganization = async (
  userData: AddUserData,
  organizationId: string,
  addedBy: string
): Promise<{ userId: string; profileId: string; isNewUser: boolean }> => {
  try {
    // Check if a profile with this username already exists
    // Note: We search by username since email is not stored in profiles table
    // In production, you might want to add email to profiles or use an invitation system
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('id, organization_id, username')
      .eq('username', userData.username.trim().toLowerCase())

    const existingProfile = existingProfiles && existingProfiles.length > 0 ? existingProfiles[0] : null

    if (existingProfile) {
      if (existingProfile.organization_id === organizationId) {
        throw new Error('User is already a member of this organization')
      } else if (existingProfile.organization_id) {
        throw new Error('User already belongs to another organization')
      } else {
        // Profile exists but no organization - update it
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            organization_id: organizationId,
            role: userData.role || 'employee',
            full_name: userData.full_name.trim(),
            department: userData.department?.trim() || '',
            position: userData.position?.trim() || '',
          })
          .eq('id', existingProfile.id)

        if (updateError) throw updateError

        // Add to default channels
        try {
          await addUserToDefaultChannels(existingProfile.id, organizationId)
        } catch (channelError) {
          console.warn('Error adding user to default channels:', channelError)
        }

        return { userId: existingProfile.id, profileId: existingProfile.id, isNewUser: false }
      }
    }

    // For new users, we need to create them via a serverless function or invitation system
    // For now, we'll throw an error asking them to sign up first
    // In production, implement an invitation system:
    // 1. Create invitation record
    // 2. Send invitation email
    // 3. User signs up with invitation code
    // 4. Profile is automatically linked to organization

    throw new Error(
      'To add new users, they must sign up first. ' +
      'Please ask the user to create an account, then you can add them to the organization. ' +
      'Alternatively, implement an invitation system using a serverless function.'
    )
  } catch (error) {
    console.error('Error adding user to organization:', error)
    throw error
  }
}

/**
 * Get organization by ID
 */
export const getOrganization = async (organizationId: string): Promise<Organization | null> => {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching organization:', error)
    return null
  }
}

/**
 * Get all users in an organization
 */
export const getOrganizationUsers = async (organizationId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, email, department, position, role, avatar_url')
      .eq('organization_id', organizationId)
      .order('full_name')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching organization users:', error)
    return []
  }
}

/**
 * Check if user has an organization
 */
export const userHasOrganization = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single()

    if (error) return false
    return !!data?.organization_id
  } catch (error) {
    console.error('Error checking user organization:', error)
    return false
  }
}

