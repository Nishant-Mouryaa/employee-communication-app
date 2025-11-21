// hooks/useProfileStats.ts
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ProfileStats } from '../types/profile'

export function useProfileStats(userId: string | undefined) {
  const [stats, setStats] = useState<ProfileStats>({
    announcements_count: 0,
    reactions_count: 0,
    member_since: '',
  })

  useEffect(() => {
    if (userId) {
      fetchStats()
    }
  }, [userId])

  const fetchStats = async () => {
    try {
      if (!userId) return

      const [announcementsResult, reactionsResult, profileResult] = await Promise.all([
        supabase
          .from('announcements')
          .select('*', { count: 'exact', head: true })
          .eq('author_id', userId),
        supabase
          .from('announcement_reactions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('profiles')
          .select('created_at')
          .eq('id', userId)
          .single(),
      ])

      setStats({
        announcements_count: announcementsResult.count || 0,
        reactions_count: reactionsResult.count || 0,
        member_since: profileResult.data?.created_at
          ? new Date(profileResult.data.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
            })
          : 'Unknown',
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  return { stats, fetchStats }
}