// components/ProfileHeader.tsx
import React from 'react'
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Profile } from '../../types/profile'

interface ProfileHeaderProps {
  profile: Profile
  userEmail: string
  uploading: boolean
  onPickImage: () => void
  onRemoveAvatar: () => void
}

export function ProfileHeader({
  profile,
  userEmail,
  uploading,
  onPickImage,
  onRemoveAvatar,
}: ProfileHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerBackground} />
      <View style={styles.headerContent}>
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={onPickImage}
            disabled={uploading}
          >
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : '?'}
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
              onPress={onPickImage}
              disabled={uploading}
            >
              <Text style={styles.avatarButtonText}>
                {profile.avatarUrl ? 'Change Photo' : 'Upload Photo'}
              </Text>
            </TouchableOpacity>

            {profile.avatarUrl && (
              <TouchableOpacity
                style={[styles.avatarButton, styles.removeButton]}
                onPress={onRemoveAvatar}
                disabled={uploading}
              >
                <Text style={[styles.avatarButtonText, styles.removeButtonText]}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.headerName}>{profile.fullName || 'No name set'}</Text>
          <Text style={styles.headerPosition}>
            {profile.position || 'No position'}{' '}
            {profile.department ? `• ${profile.department}` : ''}
          </Text>
          <Text style={styles.headerEmail}>{userEmail}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
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
})