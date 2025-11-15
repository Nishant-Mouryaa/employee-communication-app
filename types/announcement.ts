// types/announcement.ts
export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  announcement_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

export interface ReadReceipt {
  id: string;
  announcement_id: string;
  user_id: string;
  read_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  author_id: string;
  date: string;
  isImportant: boolean;
  isPinned?: boolean;
  created_at: string;
  category_id?: string;
  has_attachments?: boolean;
  profiles?: {
    username: string;
    full_name?: string;
  };
  categories?: Category;
  attachments?: Attachment[];
  reactions?: AnnouncementReaction[];
  reaction_count?: number;
  user_has_reacted?: boolean;
  read_receipts?: ReadReceipt[];
  is_read?: boolean;
  read_count?: number;
}

export interface AnnouncementReaction {
  id: string;
  announcement_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

export interface UserRole {
  canPost: boolean;
  canEditAll: boolean;
  canPin: boolean;
  canDeleteAll: boolean;
  isAdmin: boolean;
}