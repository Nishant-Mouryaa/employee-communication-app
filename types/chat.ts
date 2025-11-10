// types/chat.ts
export interface Channel {
  id: string
  name: string
  description: string
  unread_count: number
  created_at: string
}

export interface Profile {
  id?: string
  username: string
  full_name: string
  avatar_url?: string
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