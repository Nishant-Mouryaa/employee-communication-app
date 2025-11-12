// utils/chatHelpers.ts
import { Message } from '../types/chat'
export const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export const formatMessageTimestamp = (timestamp: string): string => {
  const messageDate = new Date(timestamp)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate())

  // If message is from today, show only time
  if (messageDay.getTime() === today.getTime()) {
    return formatTime(timestamp)
  }

  // If message is from yesterday, show "Yesterday"
  if (messageDay.getTime() === yesterday.getTime()) {
    return 'Yesterday'
  }

  // If message is from this week (last 6 days), show day name
  const daysDiff = Math.floor((today.getTime() - messageDay.getTime()) / (1000 * 60 * 60 * 24))
  if (daysDiff <= 6) {
    return messageDate.toLocaleDateString([], { weekday: 'short' })
  }

  // If message is older than a week, show full date
  return messageDate.toLocaleDateString([], { 
    day: 'numeric', 
    month: 'short',
    year: messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

export const shouldShowDateHeader = (currentMessage: Message, previousMessage: Message | null): boolean => {
  if (!previousMessage) return true

  const currentDate = new Date(currentMessage.created_at)
  const previousDate = new Date(previousMessage.created_at)
  
  const currentDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
  const previousDay = new Date(previousDate.getFullYear(), previousDate.getMonth(), previousDate.getDate())

  return currentDay.getTime() !== previousDay.getTime()
}

export const formatDateHeader = (timestamp: string): string => {
  const messageDate = new Date(timestamp)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate())

  // Today
  if (messageDay.getTime() === today.getTime()) {
    return 'Today'
  }

  // Yesterday
  if (messageDay.getTime() === yesterday.getTime()) {
    return 'Yesterday'
  }

  // This week (last 6 days)
  const daysDiff = Math.floor((today.getTime() - messageDay.getTime()) / (1000 * 60 * 60 * 24))
  if (daysDiff <= 6) {
    return messageDate.toLocaleDateString([], { weekday: 'long' })
  }

  // Older than a week
  return messageDate.toLocaleDateString([], { 
    day: 'numeric', 
    month: 'long',
    year: messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

export const getUserInitials = (name: string): string => {
  if (!name) return '??'
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const sanitizeMessage = (text: string): string => {
  return text
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, 500)
}

export const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

export const getTypingText = (typingUsers: Array<{ full_name?: string; username: string }>): string => {
  if (typingUsers.length === 0) return ''
  
  if (typingUsers.length === 1) {
    return `${typingUsers[0].full_name || typingUsers[0].username} is typing...`
  }
  
  if (typingUsers.length === 2) {
    return `${typingUsers[0].full_name || typingUsers[0].username} and ${typingUsers[1].full_name || typingUsers[1].username} are typing...`
  }
  
  return `${typingUsers.length} people are typing...`
}