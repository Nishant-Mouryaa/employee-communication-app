// utils/taskHelpers.ts
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  })
}

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export const formatModalDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  })
}

export const isOverdue = (dueDate: string): boolean => {
  return new Date(dueDate) < new Date() && 
         new Date(dueDate).toDateString() !== new Date().toDateString()
}

export const getNextStatus = (currentStatus: TaskStatus): TaskStatus => {
  const statuses: TaskStatus[] = ['todo', 'in-progress', 'done']
  const currentIndex = statuses.indexOf(currentStatus)
  return statuses[(currentIndex + 1) % statuses.length]
}