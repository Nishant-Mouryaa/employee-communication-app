// components/ProfileForm.tsx
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Button } from 'react-native-elements'
import { ProfileFormField } from './ProfileFormField'
import { StatusSelector } from './StatusSelector'
import { Profile } from '../../types/profile'

interface ProfileFormProps {
  profile: Profile
  isEditing: boolean
  loading: boolean
  hasChanges: boolean
  onProfileChange: (updates: Partial<Profile>) => void
  onSave: () => void
  onCancel: () => void
  onEdit: () => void
}

export function ProfileForm({
  profile,
  isEditing,
  loading,
  hasChanges,
  onProfileChange,
  onSave,
  onCancel,
  onEdit,
}: ProfileFormProps) {
  const handleFieldChange = (field: keyof Profile) => (text: string) => {
    onProfileChange({ [field]: text })
  }

  return (
    <View style={styles.form}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionIcon}>👤</Text>
          <Text style={styles.sectionTitle}>Profile Information</Text>
        </View>
        {!isEditing ? (
          <TouchableOpacity style={styles.editButton} onPress={onEdit}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.cancelEditButton} onPress={onCancel}>
            <Text style={styles.cancelEditButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.fieldsGrid}>
        <ProfileFormField
          label="Username *"
          value={profile.username}
          placeholder="Enter your username"
          disabled={!isEditing}
          onChangeText={handleFieldChange('username')}
          icon="user"
        />

        <ProfileFormField
          label="Full Name *"
          value={profile.fullName}
          placeholder="Enter your full name"
          disabled={!isEditing}
          onChangeText={handleFieldChange('fullName')}
          icon="user-check"
        />

        <ProfileFormField
          label="Department"
          value={profile.department}
          placeholder="e.g., Engineering, Sales"
          disabled={!isEditing}
          onChangeText={handleFieldChange('department')}
          icon="briefcase"
        />

        <ProfileFormField
          label="Position"
          value={profile.position}
          placeholder="e.g., Senior Developer"
          disabled={!isEditing}
          onChangeText={handleFieldChange('position')}
          icon="award"
        />
      </View>

      <View style={styles.fullWidthFields}>
        <StatusSelector
          value={profile.status}
          isEditing={isEditing}
          onChange={(status) => onProfileChange({ status })}
        />

        <ProfileFormField
          label="Phone"
          value={profile.phone}
          placeholder="Enter your phone number"
          disabled={!isEditing}
          onChangeText={handleFieldChange('phone')}
          icon="phone"
          keyboardType="phone-pad"
          fullWidth
        />

        <ProfileFormField
          label="Location"
          value={profile.location}
          placeholder="e.g., New York, USA"
          disabled={!isEditing}
          onChangeText={handleFieldChange('location')}
          icon="map-pin"
          fullWidth
        />

        <ProfileFormField
          label="Bio"
          value={profile.bio}
          placeholder="Tell us about yourself..."
          disabled={!isEditing}
          onChangeText={handleFieldChange('bio')}
          icon="file-text"
          multiline
          numberOfLines={3}
          fullWidth
        />
      </View>

      {isEditing && hasChanges && (
        <View style={styles.saveActions}>
          <Button
            title="Save Changes"
            onPress={onSave}
            disabled={loading}
            buttonStyle={styles.saveButton}
            titleStyle={styles.saveButtonText}
            loading={loading}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
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
  fullWidthFields: {
    paddingHorizontal: 20,
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
})