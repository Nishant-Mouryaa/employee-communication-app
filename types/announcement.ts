// types/announcement.ts
export interface Announcement {
  id: string
  title: string
  content: string
  author: string
  author_id: string
  date: string
  isImportant: boolean
  isPinned: boolean
  created_at: string
  updated_at?: string
  category_id?: string
  has_attachments: boolean
  categories?: Category
  attachments: Attachment[]
  reactions: Reaction[]
  reaction_count: number
  user_has_reacted: boolean
  read_receipts: ReadReceipt[]
  is_read: boolean
  read_count: number
  comments?: Comment[]
  comment_count: number
  scheduled_at?: string
  expires_at?: string
  is_scheduled: boolean
  is_expired: boolean
  status: 'draft' | 'scheduled' | 'published' | 'expired'
}

export interface Comment {
  id: string
  announcement_id: string
  user_id: string
  content: string
  created_at: string
  updated_at?: string
  parent_id?: string
  profiles?: {
    username: string
    full_name: string
    avatar_url?: string
  }
  replies?: Comment[]
  reply_count: number
  is_edited: boolean
}

export interface Category {
  id: string
  name: string
  color: string
  icon: string
}

export interface Attachment {
  id: string
  announcement_id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  uploaded_by: string
  created_at: string
}

export interface Reaction {
  id: string
  announcement_id: string
  user_id: string
  reaction_type: string
  created_at: string
}

export interface ReadReceipt {
  id: string
  announcement_id: string
  user_id: string
  read_at: string
}

export interface UserRole {
  canPost: boolean
  canEditAll: boolean
  canPin: boolean
  canDeleteAll: boolean
  isAdmin: boolean
  canSchedule: boolean
  canComment: boolean
  canModerateComments: boolean
}

export interface NotificationSettings {
  id: string
  user_id: string
  new_announcements: boolean
  important_only: boolean
  category_filters: string[]
  push_enabled: boolean
  email_enabled: boolean
  comment_replies: boolean
  mentions: boolean
}

export interface SearchFilters {
  query: string
  category: string
  dateFrom?: Date
  dateTo?: Date
  author?: string
  hasAttachments?: boolean
  isImportant?: boolean
  status?: 'all' | 'active' | 'scheduled' | 'expired'
  sortBy: 'date' | 'relevance' | 'reactions' | 'comments'
}