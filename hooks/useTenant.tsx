// hooks/useTenant.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'
import { Organization } from '../types/organization'

interface TenantProfile {
  id: string
  username: string
  full_name: string
  role?: string
  organization_id: string
}

interface TenantContextType {
  profile: TenantProfile | null
  organization: Organization | null
  organizationId: string | null
  loading: boolean
  isInvitedUser: boolean
  refreshTenant: () => Promise<void>
}

const TenantContext = createContext<TenantContextType>({
  profile: null,
  organization: null,
  organizationId: null,
  loading: true,
  isInvitedUser: false,
  refreshTenant: async () => {},
})

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<TenantProfile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isInvitedUser, setIsInvitedUser] = useState(false)
  const [loading, setLoading] = useState(true)

const loadTenant = useCallback(async () => {
  const currentUser = user
  
  if (!currentUser) {
    console.log('🚫 No user, clearing tenant data')
    setProfile(null)
    setOrganization(null)
    setIsInvitedUser(false)
    setLoading(false)
    return
  }

  console.log('🔄 Loading tenant for user:', currentUser.id)
  setLoading(true)
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        full_name,
        role,
        organization_id,
        organizations:organizations!profiles_organization_id_fkey (
          id,
          name,
          slug,
          plan,
          is_active,
          metadata
        )
      `)
      .eq('id', currentUser.id)
      .single()

    if (error) {
      console.error('❌ Error loading tenant profile:', error)
      setProfile(null)
      setOrganization(null)
      setIsInvitedUser(false)
      return
    }

    console.log('✅ Raw data from profiles:', {
      id: data.id,
      username: data.username,
      role: data.role,
      organization_id: data.organization_id,
      has_org_object: !!data.organizations
    })

    const newProfile = {
      id: data.id,
      username: data.username,
      full_name: data.full_name,
      role: data.role,
      organization_id: data.organization_id,
    }

    const newOrganization = data.organizations
      ? {
          id: data.organizations.id,
          name: data.organizations.name,
          slug: data.organizations.slug,
          plan: data.organizations.plan,
          is_active: data.organizations.is_active,
          metadata: data.organizations.metadata,
        }
      : null

    // Determine if user was invited
    const hasOrg = !!data.organization_id && !!newOrganization
    const isNonAdmin = data.role !== 'admin'
    const invited = hasOrg && isNonAdmin

    console.log('📊 Setting tenant state:', {
      hasOrg,
      isNonAdmin,
      invited,
      organization_id: newProfile.organization_id,
      org_name: newOrganization?.name
    })

    setProfile(newProfile)
    setOrganization(newOrganization)
    setIsInvitedUser(invited)
    
  } catch (error) {
    console.error('❌ Unexpected error loading tenant profile:', error)
    setProfile(null)
    setOrganization(null)
    setIsInvitedUser(false)
  } finally {
    setLoading(false)
  }
}, [user])

  // Load tenant when user changes or auth finishes loading
  useEffect(() => {
    if (!authLoading) {
      console.log('🔓 Auth loaded, triggering tenant load')
      loadTenant()
    }
  }, [authLoading, user?.id, loadTenant])

  // Subscribe to profile changes for real-time updates
  useEffect(() => {
    if (!user?.id) return

    console.log('📡 Setting up profile subscription for user:', user.id)
    
    const channel = supabase
      .channel(`profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔔 Profile changed, reloading tenant:', payload)
          loadTenant()
        }
      )
      .subscribe()

    return () => {
      console.log('🧹 Cleaning up profile subscription')
      supabase.removeChannel(channel)
    }
  }, [user?.id, loadTenant])

  const value: TenantContextType = {
    profile,
    organization,
    organizationId: profile?.organization_id || null,
    loading: authLoading || loading,
    isInvitedUser,
    refreshTenant: loadTenant,
  }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}