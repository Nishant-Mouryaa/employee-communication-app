// hooks/useHomeData.ts
import { useState, useCallback } from 'react'
import { Stats } from '../types/home'
import { 
  fetchUnreadMessagesCount, 
  fetchPendingTasksCount, 
  fetchRecentActivities 
} from '../services/homeDataService'

export const useHomeData = (userId: string | undefined) => {
  const [stats, setStats] = useState<Stats>({
    unreadMessages: 0,
    pendingTasks: 0,
    recentActivities: []
  })
  const [loading, setLoading] = useState(true)

  const fetchHomeData = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      
      const [unreadMessages, pendingTasks, recentActivities] = await Promise.all([
        fetchUnreadMessagesCount(userId),
        fetchPendingTasksCount(userId),
        fetchRecentActivities(userId)
      ])

      setStats({
        unreadMessages,
        pendingTasks,
        recentActivities
      })
    } catch (error) {
      console.error('Error fetching home data:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const updateUnreadCount = useCallback(async () => {
    if (!userId) return
    const count = await fetchUnreadMessagesCount(userId)
    setStats(prev => ({ ...prev, unreadMessages: count }))
  }, [userId])

  const updatePendingTasks = useCallback(async () => {
    if (!userId) return
    const count = await fetchPendingTasksCount(userId)
    setStats(prev => ({ ...prev, pendingTasks: count }))
  }, [userId])

  const updateActivities = useCallback(async () => {
    if (!userId) return
    const activities = await fetchRecentActivities(userId)
    setStats(prev => ({ ...prev, recentActivities: activities }))
  }, [userId])

  return {
    stats,
    loading,
    fetchHomeData,
    updateUnreadCount,
    updatePendingTasks,
    updateActivities
  }
}