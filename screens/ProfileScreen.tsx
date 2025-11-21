// screens/ProfileScreen.tsx
import React, { useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useProfileStats } from '../hooks/useProfileStats'
import { useImageUpload } from '../hooks/useImageUpload'
import { ProfileHeader } from '../components/profile/ProfileHeader'
import { ProfileStats } from '../components/profile/ProfileStats'
import { ProfileForm } from '../components/profile/ProfileForm'
import { ProfileActions } from '../components/profile/ProfileActions'
import { EmptyState } from '../components/profile/EmptyState'
import { LoadingState } from '../components/profile/LoadingState'
import { Profile } from '../types/profile'

export default function ProfileScreen() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)

  const {
    profile,
    setProfile,
    loading,
    fetchProfile,
    updateProfile,
    resetProfile,
    hasChanges,
  } = useProfile(user?.id)

  const { stats, fetchStats } = useProfileStats(user?.id)

  const handleAvatarUpload = (url: string) => {
    setProfile((prev) => ({ ...prev, avatarUrl: url }))
    setIsEditing(true)
  }

  const { uploading, pickImage, removeAvatar } = useImageUpload(user?.id, handleAvatarUpload)

  const handleProfileChange = (updates: Partial<Profile>) => {
    setProfile((prev) => ({ ...prev, ...updates }))
    if (!isEditing) setIsEditing(true)
  }

  const handleSave = async () => {
    const success = await updateProfile()
    if (success) {
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    resetProfile()
    setIsEditing(false)
  }

  const handleRefresh = () => {
    fetchProfile()
    fetchStats()
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="👤"
          title="Welcome!"
          message="Please sign in to view your profile"
        />
      </View>
    )
  }

  if (loading && !profile.username) {
    return (
      <View style={styles.container}>
        <LoadingState message="Loading your profile..." />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ProfileHeader
        profile={profile}
        userEmail={user.email || ''}
        uploading={uploading}
        onPickImage={pickImage}
        onRemoveAvatar={removeAvatar}
      />

      <ProfileStats stats={stats} />

      <ProfileForm
        profile={profile}
        isEditing={isEditing}
        loading={loading}
        hasChanges={hasChanges()}
        onProfileChange={handleProfileChange}
        onSave={handleSave}
        onCancel={handleCancel}
        onEdit={() => setIsEditing(true)}
      />

      <ProfileActions onRefresh={handleRefresh} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
})