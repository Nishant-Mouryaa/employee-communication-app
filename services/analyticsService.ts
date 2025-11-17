// services/analyticsService.ts
import { supabase } from '../lib/supabase'
import { AnnouncementAnalytics, AnalyticsSummary, UserActivityLog } from '../types/announcement'

export const analyticsService = {
  async trackView(announcementId: string, userId: string, readTime: number = 0) {
    try {
      const { error } = await supabase.rpc('track_announcement_view', {
        p_announcement_id: announcementId,
        p_user_id: userId,
        p_read_time: readTime
      })

      if (error) throw error
    } catch (error) {
      console.error('Error tracking view:', error)
    }
  },

  async logActivity(
    userId: string,
    announcementId: string,
    activityType: UserActivityLog['activity_type'],
    metadata?: Record<string, any>
  ) {
    try {
      const { error } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: userId,
          announcement_id: announcementId,
          activity_type: activityType,
          metadata: metadata || {}
        })

      if (error) throw error
    } catch (error) {
      console.error('Error logging activity:', error)
    }
  },

  async getAnalyticsSummary(startDate: Date, endDate: Date): Promise<AnalyticsSummary | null> {
    try {
      const { data, error } = await supabase.rpc('get_analytics_summary', {
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0]
      })

      if (error) throw error
      return data?.[0] || null
    } catch (error) {
      console.error('Error fetching analytics summary:', error)
      return null
    }
  },

  async getAnnouncementAnalytics(announcementId: string): Promise<AnnouncementAnalytics[]> {
    try {
      const { data, error } = await supabase
        .from('announcement_analytics')
        .select('*')
        .eq('announcement_id', announcementId)
        .order('date', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching announcement analytics:', error)
      return []
    }
  },

  async getTopAnnouncements(limit: number = 10, startDate?: Date, endDate?: Date) {
    try {
      let query = supabase
        .from('announcement_analytics')
        .select(`
          announcement_id,
          announcements!inner(id, title, created_at),
          view_count,
          reaction_count,
          comment_count
        `)
        .order('view_count', { ascending: false })
        .limit(limit)

      if (startDate) {
        query = query.gte('date', startDate.toISOString().split('T')[0])
      }
      if (endDate) {
        query = query.lte('date', endDate.toISOString().split('T')[0])
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching top announcements:', error)
      return []
    }
  },

  async getChartData(startDate: Date, endDate: Date) {
    try {
      const { data, error } = await supabase
        .from('announcement_analytics')
        .select('date, view_count, reaction_count, comment_count')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (error) throw error

      // Aggregate by date
      const aggregated = (data || []).reduce((acc: any, curr) => {
        const existing = acc.find((item: any) => item.date === curr.date)
        if (existing) {
          existing.views += curr.view_count
          existing.reactions += curr.reaction_count
          existing.comments += curr.comment_count
        } else {
          acc.push({
            date: curr.date,
            views: curr.view_count,
            reactions: curr.reaction_count,
            comments: curr.comment_count
          })
        }
        return acc
      }, [])

      return aggregated
    } catch (error) {
      console.error('Error fetching chart data:', error)
      return []
    }
  },

  async getUserActivity(userId: string, limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select(`
          *,
          announcements!inner(id, title)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching user activity:', error)
      return []
    }
  }
}