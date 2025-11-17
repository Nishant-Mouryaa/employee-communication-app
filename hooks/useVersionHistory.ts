// hooks/useVersionHistory.ts
import { useState, useEffect } from 'react'
import { versionHistoryService } from '../services/versionHistoryService'
import { AnnouncementVersion } from '../types/announcement'

export const useVersionHistory = (announcementId: string) => {
  const [versions, setVersions] = useState<AnnouncementVersion[]>([])
  const [loading, setLoading] = useState(false)

  const fetchVersions = async () => {
    if (!announcementId) return

    try {
      setLoading(true)
      const data = await versionHistoryService.getVersionHistory(announcementId)
      setVersions(data)
    } catch (error) {
      console.error('Error fetching version history:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVersions()
  }, [announcementId])

  return { versions, loading, refetch: fetchVersions }
}