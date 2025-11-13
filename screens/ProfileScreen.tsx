// screens/ProfileScreen.tsx
import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native'
import { Button, Input } from 'react-native-elements'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const STATUS_OPTIONS = [
  'Available',
  'In a meeting',
  'On leave',
  'Out sick',
  'Commuting',
  'Do not disturb',
  'Away',
]

interface ProfileStats {
  announcements_count: number
  reactions_count: number
  member_since: string
}

export default function ProfileScreen() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [status, setStatus] = useState('')
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  
  const [stats, setStats] = useState<ProfileStats>({
    announcements_count: 0,
    reactions_count: 0,
    member_since: ''
  })

  const [originalValues, setOriginalValues] = useState({
    username: '',
    fullName: '',
    department: '',
    position: '',
    status: '',
    bio: '',
    phone: '',
    location: '',
    avatarUrl: ''
  })

  useEffect(() => {
    if (user) {
      getProfile()
      getProfileStats()
    }
  }, [user])

  async function getProfile() {
    try {
      setLoading(true)
      if (!user) throw new Error('No user found!')

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username, full_name, department, position, avatar_url, bio, phone, location, status`)
        .eq('id', user.id)
        .single()
      
      if (error && status !== 406) {
        throw error
      }

      if (data) {
        const profileData = {
          username: data.username || '',
          fullName: data.full_name || '',
          department: data.department || '',
          position: data.position || '',
          avatarUrl: data.avatar_url || '',
          status: data.status || '',
          bio: data.bio || '',
          phone: data.phone || '',
          location: data.location || ''
        }
        
        setUsername(profileData.username)
        setFullName(profileData.fullName)
        setDepartment(profileData.department)
        setPosition(profileData.position)
        setAvatarUrl(profileData.avatarUrl)
        setStatus(profileData.status)
        setBio(profileData.bio)
        setPhone(profileData.phone)
        setLocation(profileData.location)
        
        setOriginalValues(profileData)
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Error loading profile', error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function getProfileStats() {
    try {
      if (!user) return

      const { count: announcementsCount } = await supabase
        .from('announcements')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', user.id)

      const { count: reactionsCount } = await supabase
        .from('announcement_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', user.id)
        .single()

      setStats({
        announcements_count: announcementsCount || 0,
        reactions_count: reactionsCount || 0,
        member_since: profileData?.created_at 
          ? new Date(profileData.created_at).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long' 
            })
          : 'Unknown'
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

async function updateProfile() {
  try {
    if (!user) throw new Error('No user found!')

    // Validate BEFORE setting loading state
    if (!username.trim()) {
      Alert.alert('Validation Error', 'Username is required')
      return
    }
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full name is required')
      return
    }

    setLoading(true) // Move loading state here, after validation

    const updates = {
      id: user.id,
      username: username.trim(),
      full_name: fullName.trim(),
      department: department.trim(),
      position: position.trim(),
      avatar_url: avatarUrl,
      status: status.trim() || null,
      bio: bio.trim(),
      phone: phone.trim(),
      location: location.trim(),
      updated_at: new Date().toISOString(),
    }

    // Use update with eq instead of upsert for better reliability
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (error) {
      console.error('Supabase error:', error) // Add logging
      throw error
    }

    // Update original values to reflect saved state
    setOriginalValues({
      username,
      fullName,
      department,
      position,
      status,
      bio,
      phone,
      location,
      avatarUrl
    })

    Alert.alert('Success', 'Profile updated successfully!')
    setIsEditing(false)
    
    // Refresh the profile to confirm the update
    await getProfile()
    
  } catch (error) {
    console.error('Update error:', error) // Add logging
    if (error instanceof Error) {
      Alert.alert('Update failed', error.message)
    }
  } finally {
    setLoading(false)
  }
}

  const cancelEdit = () => {
    setUsername(originalValues.username)
    setFullName(originalValues.fullName)
    setDepartment(originalValues.department)
    setPosition(originalValues.position)
    setStatus(originalValues.status)
    setBio(originalValues.bio)
    setPhone(originalValues.phone)
    setLocation(originalValues.location)
    setAvatarUrl(originalValues.avatarUrl)
    setIsEditing(false)
  }

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0])
      }
    } catch (error) {
      console.error('Error picking image:', error)
      Alert.alert('Error', 'Failed to pick image')
    }
  }

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      if (!user) {
        throw new Error('No user found')
      }

      setUploading(true)

      const response = await fetch(asset.uri)
      if (!response.ok) {
        throw new Error('Failed to read selected image')
      }

      const arrayBuffer = response.arrayBuffer
        ? await response.arrayBuffer()
        : null

      if (!arrayBuffer) {
        throw new Error('Unable to process selected image')
      }

      const inferredExt =
        asset.fileName?.split('.').pop()?.toLowerCase() ||
        asset.uri.split('.').pop()?.toLowerCase() ||
        'jpg'

      const fileExt = inferredExt.replace('jpeg', 'jpg')
      const contentType = asset.mimeType || `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`

      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, arrayBuffer, {
          contentType,
          upsert: true
        })

      if (uploadError) {
        throw uploadError
      }

      const { data: publicUrlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath)

      if (!publicUrlData?.publicUrl) {
        throw new Error('Unable to retrieve profile image URL')
      }

      setAvatarUrl(publicUrlData.publicUrl)
      Alert.alert('Success', 'Profile picture uploaded!')
      setIsEditing(true)
    } catch (error) {
      console.error('Error uploading image:', error)
      Alert.alert('Upload failed', 'Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const removeAvatar = () => {
    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setAvatarUrl('')
            setIsEditing(true)
          }
        }
      ]
    )
  }

  const hasChanges = () => {
    return (
      username !== originalValues.username ||
      fullName !== originalValues.fullName ||
      department !== originalValues.department ||
      position !== originalValues.position ||
      status !== originalValues.status ||
      bio !== originalValues.bio ||
      phone !== originalValues.phone ||
      location !== originalValues.location ||
      avatarUrl !== originalValues.avatarUrl
    )
  }

  const renderStatusOptions = () => (
    <View style={styles.statusContainer}>
      <Text style={styles.label}>Status</Text>
      <View style={styles.statusGrid}>
        {STATUS_OPTIONS.map(option => {
          const isSelected = status === option
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.statusChip,
                isSelected && styles.statusChipSelected,
                !isEditing && styles.statusChipDisabled
              ]}
              disabled={!isEditing}
              onPress={() => {
                setStatus(prev => (prev === option ? '' : option))
                if (!isEditing) setIsEditing(true)
              }}
            >
              <Text style={[
                styles.statusChipText,
                isSelected && styles.statusChipTextSelected
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
      {status ? (
        <TouchableOpacity
          style={styles.clearStatusButton}
          onPress={() => {
            setStatus('')
            if (!isEditing) setIsEditing(true)
          }}
          disabled={!isEditing}
        >
          <Text style={styles.clearStatusText}>Clear status</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyIcon}>👤</Text>
          </View>
          <Text style={styles.emptyTitle}>Welcome!</Text>
          <Text style={styles.emptyText}>Please sign in to view your profile</Text>
        </View>
      </View>
    )
  }

  if (loading && !username) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerBackground} />
        <View style={styles.headerContent}>
          <View style={styles.avatarSection}>
            <TouchableOpacity 
              style={styles.avatarContainer}
              onPress={pickImage}
              disabled={uploading}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>
                    {fullName ? fullName.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              )}
              
              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color="white" />
                </View>
              )}
              
              <View style={styles.avatarEditBadge}>
                <Text style={styles.avatarEditIcon}>📷</Text>
              </View>
            </TouchableOpacity>
            
            <View style={styles.avatarActions}>
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={pickImage}
                disabled={uploading}
              >
                <Text style={styles.avatarButtonText}>
                  {avatarUrl ? 'Change Photo' : 'Upload Photo'}
                </Text>
              </TouchableOpacity>
              
              {avatarUrl && (
                <TouchableOpacity
                  style={[styles.avatarButton, styles.removeButton]}
                  onPress={removeAvatar}
                  disabled={uploading}
                >
                  <Text style={[styles.avatarButtonText, styles.removeButtonText]}>
                    Remove
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.headerName}>{fullName || 'No name set'}</Text>
            <Text style={styles.headerPosition}>
              {position || 'No position'} {department ? `• ${department}` : ''}
            </Text>
            <Text style={styles.headerEmail}>{user.email}</Text>
          </View>
        </View>
      </View>

      {/* Enhanced Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, styles.announcementsIcon]}>
            <Text style={styles.statIconText}>📢</Text>
          </View>
          <Text style={styles.statNumber}>{stats.announcements_count}</Text>
          <Text style={styles.statLabel}>Announcements</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statCard}>
          <View style={[styles.statIcon, styles.reactionsIcon]}>
            <Text style={styles.statIconText}>❤️</Text>
          </View>
          <Text style={styles.statNumber}>{stats.reactions_count}</Text>
          <Text style={styles.statLabel}>Reactions</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statCard}>
          <View style={[styles.statIcon, styles.memberIcon]}>
            <Text style={styles.statIconText}>📅</Text>
          </View>
          <Text style={styles.statValue}>{stats.member_since}</Text>
          <Text style={styles.statLabel}>Member Since</Text>
        </View>
      </View>

      {/* Enhanced Profile Form */}
      <View style={styles.form}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionIcon}>👤</Text>
            <Text style={styles.sectionTitle}>Profile Information</Text>
          </View>
          {!isEditing ? (
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.cancelEditButton}
              onPress={cancelEdit}
            >
              <Text style={styles.cancelEditButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.fieldsGrid}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username *</Text>
            <Input
              value={username}
              onChangeText={(text) => {
                setUsername(text)
                if (!isEditing) setIsEditing(true)
              }}
              placeholder="Enter your username"
              autoCapitalize="none"
              disabled={!isEditing}
              inputContainerStyle={[
                styles.inputContainer,
                !isEditing && styles.inputContainerDisabled
              ]}
              inputStyle={styles.input}
              placeholderTextColor="#9ca3af"
              leftIcon={{ type: 'feather', name: 'user', color: '#6366F1', size: 18 }}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <Input
              value={fullName}
              onChangeText={(text) => {
                setFullName(text)
                if (!isEditing) setIsEditing(true)
              }}
              placeholder="Enter your full name"
              disabled={!isEditing}
              inputContainerStyle={[
                styles.inputContainer,
                !isEditing && styles.inputContainerDisabled
              ]}
              inputStyle={styles.input}
              placeholderTextColor="#9ca3af"
              leftIcon={{ type: 'feather', name: 'user-check', color: '#6366F1', size: 18 }}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Department</Text>
            <Input
              value={department}
              onChangeText={(text) => {
                setDepartment(text)
                if (!isEditing) setIsEditing(true)
              }}
              placeholder="e.g., Engineering, Sales"
              disabled={!isEditing}
              inputContainerStyle={[
                styles.inputContainer,
                !isEditing && styles.inputContainerDisabled
              ]}
              inputStyle={styles.input}
              placeholderTextColor="#9ca3af"
              leftIcon={{ type: 'feather', name: 'briefcase', color: '#6366F1', size: 18 }}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Position</Text>
            <Input
              value={position}
              onChangeText={(text) => {
                setPosition(text)
                if (!isEditing) setIsEditing(true)
              }}
              placeholder="e.g., Senior Developer"
              disabled={!isEditing}
              inputContainerStyle={[
                styles.inputContainer,
                !isEditing && styles.inputContainerDisabled
              ]}
              inputStyle={styles.input}
              placeholderTextColor="#9ca3af"
              leftIcon={{ type: 'feather', name: 'award', color: '#6366F1', size: 18 }}
            />
          </View>
        </View>

        <View style={styles.fullWidthFields}>
          {renderStatusOptions()}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone</Text>
            <Input
              value={phone}
              onChangeText={(text) => {
                setPhone(text)
                if (!isEditing) setIsEditing(true)
              }}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              disabled={!isEditing}
              inputContainerStyle={[
                styles.inputContainer,
                !isEditing && styles.inputContainerDisabled
              ]}
              inputStyle={styles.input}
              placeholderTextColor="#9ca3af"
              leftIcon={{ type: 'feather', name: 'phone', color: '#6366F1', size: 18 }}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Location</Text>
            <Input
              value={location}
              onChangeText={(text) => {
                setLocation(text)
                if (!isEditing) setIsEditing(true)
              }}
              placeholder="e.g., New York, USA"
              disabled={!isEditing}
              inputContainerStyle={[
                styles.inputContainer,
                !isEditing && styles.inputContainerDisabled
              ]}
              inputStyle={styles.input}
              placeholderTextColor="#9ca3af"
              leftIcon={{ type: 'feather', name: 'map-pin', color: '#6366F1', size: 18 }}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Bio</Text>
            <Input
              value={bio}
              onChangeText={(text) => {
                setBio(text)
                if (!isEditing) setIsEditing(true)
              }}
              placeholder="Tell us about yourself..."
              multiline
              numberOfLines={3}
              disabled={!isEditing}
              inputContainerStyle={[
                styles.inputContainer,
                styles.textAreaContainer,
                !isEditing && styles.inputContainerDisabled
              ]}
              inputStyle={styles.textArea}
              placeholderTextColor="#9ca3af"
              leftIcon={{ type: 'feather', name: 'file-text', color: '#6366F1', size: 18 }}
            />
          </View>
        </View>

        {isEditing && hasChanges() && (
          <View style={styles.saveActions}>
            <Button
              title="Save Changes"
              onPress={updateProfile}
              disabled={loading}
              buttonStyle={styles.saveButton}
              titleStyle={styles.saveButtonText}
              loading={loading}
            />
          </View>
        )}

        {/* Enhanced Actions Section */}
        <View style={styles.actionsSection}>
          <Text style={styles.actionsTitle}>Account Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => {
                getProfile()
                getProfileStats()
              }}
            >
              <View style={[styles.actionIcon, styles.refreshIcon]}>
                <Text style={styles.actionIconText}>🔄</Text>
              </View>
              <Text style={styles.actionTitle}>Refresh</Text>
              <Text style={styles.actionDescription}>Update profile data</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => {
                Alert.alert(
                  'Sign Out',
                  'Are you sure you want to sign out?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Sign Out', 
                      style: 'destructive',
                      onPress: () => supabase.auth.signOut() 
                    }
                  ]
                )
              }}
            >
              <View style={[styles.actionIcon, styles.signOutIcon]}>
                <Text style={styles.actionIconText}>🚪</Text>
              </View>
              <Text style={styles.actionTitle}>Sign Out</Text>
              <Text style={styles.actionDescription}>Log out of your account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8f9fa',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  header: {
    backgroundColor: '#6366F1',
    minHeight: 200,
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#6366F1',
  },
  headerContent: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarPlaceholderText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#6366F1',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  avatarEditIcon: {
    fontSize: 12,
    color: 'white',
  },
  avatarActions: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  avatarButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  removeButtonText: {
    color: '#fecaca',
  },
  userInfo: {
    alignItems: 'center',
  },
  headerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerPosition: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: -25,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  announcementsIcon: {
    backgroundColor: '#e0e7ff',
  },
  reactionsIcon: {
    backgroundColor: '#fce7f3',
  },
  memberIcon: {
    backgroundColor: '#f0fdf4',
  },
  statIconText: {
    fontSize: 16,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 8,
  },
  form: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 20,
    padding: 0,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  editButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelEditButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelEditButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  fieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  fieldGroup: {
    width: '50%',
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  fullWidthFields: {
    paddingHorizontal: 20,
  },
  statusContainer: {
    marginBottom: 20,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  statusChipSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  statusChipDisabled: {
    opacity: 0.6,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  statusChipTextSelected: {
    color: 'white',
  },
  clearStatusButton: {
    marginTop: 8,
  },
  clearStatusText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    color: '#374151',
    marginLeft: 4,
  },
  inputContainer: {
    borderBottomWidth: 0,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  inputContainerDisabled: {
    backgroundColor: '#f8f9fa',
    opacity: 0.7,
  },
  input: {
    fontSize: 14,
    color: '#111827',
    paddingVertical: 8,
  },
  textAreaContainer: {
    minHeight: 90,
    alignItems: 'flex-start',
  },
  textArea: {
    textAlignVertical: 'top',
    paddingTop: 12,
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  saveActions: {
    padding: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  saveButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionsSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#fafafa',
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  refreshIcon: {
    backgroundColor: '#e0e7ff',
  },
  signOutIcon: {
    backgroundColor: '#fee2e2',
  },
  actionIconText: {
    fontSize: 18,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
})