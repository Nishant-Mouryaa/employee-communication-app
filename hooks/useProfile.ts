// hooks/useProfile.ts
import { useState, useEffect } from 'react'
import { Alert } from 'react-native'
import { supabase } from '../lib/supabase'
import { Profile } from '../types/profile'

export function useProfile(userId: string | undefined) {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile>({
    username: '',
    fullName: '',
    department: '',
    position: '',
    avatarUrl: '',
    status: '',
    bio: '',
    phone: '',
    location: '',
  })
  const [originalProfile, setOriginalProfile] = useState<Profile>(profile)

  useEffect(() => {
    if (userId) {
      fetchProfile()
    }
  }, [userId])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      if (!userId) throw new Error('No user found!')

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username, full_name, department, position, avatar_url, bio, phone, location, status`)
        .eq('id', userId)
        .single()

      if (error && status !== 406) throw error

      if (data) {
        const profileData: Profile = {
          username: data.username || '',
          fullName: data.full_name || '',
          department: data.department || '',
          position: data.position || '',
          avatarUrl: data.avatar_url || '',
          status: data.status || '',
          bio: data.bio || '',
          phone: data.phone || '',
          location: data.location || '',
        }

        setProfile(profileData)
        setOriginalProfile(profileData)
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Error loading profile', error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async () => {
    try {
      if (!userId) throw new Error('No user found!')

      if (!profile.username.trim() || !profile.fullName.trim()) {
        Alert.alert('Validation Error', 'Username and full name are required')
        return false
      }

      setLoading(true)

      const updates = {
        id: userId,
        username: profile.username.trim(),
        full_name: profile.fullName.trim(),
        department: profile.department.trim(),
        position: profile.position.trim(),
        avatar_url: profile.avatarUrl,
        status: profile.status.trim() || null,
        bio: profile.bio.trim(),
        phone: profile.phone.trim(),
        location: profile.location.trim(),
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)

      if (error) throw error

      setOriginalProfile(profile)
      Alert.alert('Success', 'Profile updated successfully!')
      return true
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Update failed', error.message)
      }
      return false
    } finally {
      setLoading(false)
    }
  }

  const resetProfile = () => {
    setProfile(originalProfile)
  }

  const hasChanges = () => {
    return JSON.stringify(profile) !== JSON.stringify(originalProfile)
  }

  return {
    profile,
    setProfile,
    originalProfile,
    loading,
    fetchProfile,
    updateProfile,
    resetProfile,
    hasChanges,
  }
}