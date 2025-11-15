// hooks/useAnnouncementFilters.ts
import { useState, useEffect, useMemo } from 'react'
import { Announcement } from '../types/announcement'

export const useAnnouncementFilters = (announcements: Announcement[]) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterImportant, setFilterImportant] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  const filteredAnnouncements = useMemo(() => {
    let filtered = [...announcements]

    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.author.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (filterImportant) {
      filtered = filtered.filter(item => item.isImportant)
    }

    if (selectedCategory) {
      filtered = filtered.filter(item => item.category_id === selectedCategory)
    }

    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      if (a.isImportant && !b.isImportant) return -1
      if (!a.isImportant && b.isImportant) return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return filtered
  }, [announcements, searchQuery, filterImportant, selectedCategory])

  const clearFilters = () => {
    setSearchQuery('')
    setFilterImportant(false)
    setSelectedCategory('')
  }

  return {
    searchQuery,
    setSearchQuery,
    filterImportant,
    setFilterImportant,
    selectedCategory,
    setSelectedCategory,
    filteredAnnouncements,
    clearFilters
  }
}