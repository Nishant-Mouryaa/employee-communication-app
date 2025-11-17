// hooks/useEnhancedSearch.ts
import { useState, useMemo } from 'react'
import { Announcement, SearchFilters } from '../types/announcement'

export const useEnhancedSearch = (announcements: Announcement[]) => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: '',
    dateFrom: undefined,
    dateTo: undefined,
    author: undefined,
    hasAttachments: undefined,
    isImportant: undefined,
    status: 'all',
    sortBy: 'date'
  })

  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      query: '',
      category: '',
      dateFrom: undefined,
      dateTo: undefined,
      author: undefined,
      hasAttachments: undefined,
      isImportant: undefined,
      status: 'all',
      sortBy: 'date'
    })
  }

  const filteredAnnouncements = useMemo(() => {
    let filtered = [...announcements]

    // Text search with relevance scoring
    if (filters.query.trim()) {
      const query = filters.query.toLowerCase()
      filtered = filtered
        .map(item => {
          let relevanceScore = 0
          const titleMatch = item.title.toLowerCase().includes(query)
          const contentMatch = item.content.toLowerCase().includes(query)
          const authorMatch = item.author.toLowerCase().includes(query)
          
          if (titleMatch) relevanceScore += 10
          if (contentMatch) relevanceScore += 5
          if (authorMatch) relevanceScore += 3
          
          return { ...item, relevanceScore }
        })
        .filter(item => item.relevanceScore > 0)
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(item => item.category_id === filters.category)
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(
        item => new Date(item.created_at) >= filters.dateFrom!
      )
    }
    if (filters.dateTo) {
      filtered = filtered.filter(
        item => new Date(item.created_at) <= filters.dateTo!
      )
    }

    // Author filter
    if (filters.author) {
      filtered = filtered.filter(item => item.author_id === filters.author)
    }

    // Attachments filter
    if (filters.hasAttachments !== undefined) {
      filtered = filtered.filter(item => item.has_attachments === filters.hasAttachments)
    }

    // Important filter
    if (filters.isImportant !== undefined) {
      filtered = filtered.filter(item => item.isImportant === filters.isImportant)
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(item => {
        if (filters.status === 'active') return item.status === 'published' && !item.is_expired
        if (filters.status === 'scheduled') return item.status === 'scheduled'
        if (filters.status === 'expired') return item.is_expired
        return true
      })
    }

    // Sorting
    filtered.sort((a, b) => {
      // Pinned items always first
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1

      switch (filters.sortBy) {
        case 'relevance':
          return (b.relevanceScore || 0) - (a.relevanceScore || 0)
        case 'reactions':
          return b.reaction_count - a.reaction_count
        case 'comments':
          return b.comment_count - a.comment_count
        case 'date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    return filtered
  }, [announcements, filters])

  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.query ||
      filters.category ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.author ||
      filters.hasAttachments !== undefined ||
      filters.isImportant !== undefined ||
      filters.status !== 'all'
    )
  }, [filters])

  return {
    filters,
    updateFilter,
    clearFilters,
    filteredAnnouncements,
    hasActiveFilters
  }
}