// services/invitationService.ts
import { supabase } from '../lib/supabase'
import * as Linking from 'expo-linking'
import * as Crypto from 'expo-crypto'
import Constants from 'expo-constants'

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo'

export const createInvitation = async (
  email: string,
  role: 'employee' | 'manager' | 'admin',
  organizationId: string,
  invitedBy: string
) => {
  try {
    const token = await generateSecureToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        email,
        role,
        organization_id: organizationId,
        invited_by: invitedBy,
        token,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    // Generate the invitation link
    const inviteLink = generateInviteLink(token, organizationId)
    
    console.log('📧 Generated invite link:', inviteLink)

    // Send email (or just log it for now if you don't have email setup)
    await sendInvitationEmail(email, inviteLink, role, organizationId)

    return invitation
  } catch (error) {
    console.error('Error creating invitation:', error)
    throw error
  }
}

function generateInviteLink(token: string, organizationId: string): string {
  // For Expo Go development
  if (__DEV__ || isExpoGo) {
    // This creates: exp://192.168.x.x:8081/--/invite?token=...&org=...
    const url = Linking.createURL('invite', {
      queryParams: { 
        token, 
        org: organizationId 
      }
    })
    console.log('🔗 Expo Go link:', url)
    return url
  }
  
  // For production standalone builds
  // This creates: supabaseauth://invite?token=...&org=...
  return `supabaseauth://invite?token=${token}&org=${organizationId}`
}

async function sendInvitationEmail(
  email: string,
  inviteLink: string,
  role: string,
  organizationId: string
) {
  try {
    // For now, just log the invitation (you can set up email later)
    console.log('📧 Would send email to:', email)
    console.log('🔗 Invitation link:', inviteLink)
    console.log('👤 Role:', role)
   
    const { data, error } = await supabase.functions.invoke('send-invitation-email', {
      body: {
        to: email,
        inviteLink,
        role,
        organizationId,
      },
    })
    if (error) throw error
    
    return { success: true }
  } catch (error) {
    console.error('❌ Error sending email:', error)
    throw new Error('Failed to send invitation email')
  }
}

// ✅ Fixed: Use expo-crypto instead of web crypto API
async function generateSecureToken(): Promise<string> {
  // Generate 32 random bytes and convert to hex string
  const randomBytes = await Crypto.getRandomBytesAsync(32)
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export const validateInvitation = async (token: string, organizationId: string) => {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .eq('organization_id', organizationId)
    .is('accepted_at', null)
    .single()

  if (error) throw error
  
  // Check if expired
  if (data && new Date(data.expires_at) < new Date()) {
    throw new Error('Invitation has expired')
  }

  return data
}

export const acceptInvitation = async (
  token: string,
  userId: string
) => {
  const { error } = await supabase
    .from('invitations')
    .update({ 
      accepted_at: new Date().toISOString(),
      accepted_by: userId 
    })
    .eq('token', token)

  if (error) throw error
}

export const getOrganizationInvitations = async (organizationId: string) => {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const cancelInvitation = async (invitationId: string) => {
  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId)

  if (error) throw error
}