// types/chat.ts
export interface Channel {
  id: string
  name: string
  description: string
  unread_count: number
  created_at: string
  type?: 'channel' | 'direct' // Add channel type
  dm_user?: Profile // For DMs, store the other user's profile
  member_count?: number // Number of members in the channel
}

export interface Profile {
  id?: string
  username: string
  full_name: string
  avatar_url?: string
  last_seen?: string
  is_online?: boolean
    department?: string      // Add this
  position?: string
}

export type MessageAttachmentType = 'image' | 'video' | 'audio' | 'document' | 'other'

export interface MessageAttachment {
  id: string
  name: string
  url: string
  type: MessageAttachmentType
  mime_type?: string
  size?: number
  thumbnail_url?: string
  width?: number
  height?: number
}

export interface PendingAttachment {
  id: string
  uri: string
  name: string
  type: MessageAttachmentType
  mime_type?: string
  size?: number
}

export interface Reaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
  profiles?: Profile
}

export interface Message {
  id: string
  content: string
  user_id: string
  channel_id: string
  created_at: string
  profiles: Profile
  read_by?: string[]
  read_count?: number
  reactions?: Reaction[]
  reply_to?: string
  reply_message?: Message
  edited_at?: string
  is_edited?: boolean
  mentions?: string[]
  attachments?: MessageAttachment[]
}

export interface TypingUser {
  user_id: string
  username: string
  full_name: string
}

export interface ChatState {
  channels: Channel[]
  selectedChannel: Channel | null
  messages: Message[]
  channelMembers: Map<string, Profile>
  typingUsers: TypingUser[]
  loading: boolean
  sending: boolean
  refreshing: boolean
}

export interface ChannelMember {
  user_id: string
  channel_id: string
  profiles: Profile
  joined_at: string
}