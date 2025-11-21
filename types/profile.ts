// types/profile.types.ts
export interface Profile {
  username: string
  fullName: string
  department: string
  position: string
  avatarUrl: string
  status: string
  bio: string
  phone: string
  location: string
}

export interface ProfileStats {
  announcements_count: number
  reactions_count: number
  member_since: string
}

export interface ProfileFormProps {
  profile: Profile
  isEditing: boolean
  loading: boolean
  onProfileChange: (updates: Partial<Profile>) => void
  onSave: () => void
  onCancel: () => void
  onEdit: () => void
  hasChanges: boolean
}