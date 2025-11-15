// utils/announcementHelpers.ts
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export const formatFileSize = (bytes: number): string => {
  return `${(bytes / 1024).toFixed(1)} KB`
}

export const canUserEdit = (userId: string, authorId: string, canEditAll: boolean): boolean => {
  return canEditAll || userId === authorId
}

export const canUserDelete = (userId: string, authorId: string, canDeleteAll: boolean): boolean => {
  return canDeleteAll || userId === authorId
}