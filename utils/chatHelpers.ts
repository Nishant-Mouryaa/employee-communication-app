// utils/chatHelpers.ts
export const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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