// services/schedulingService.ts
import { supabase } from '../lib/supabase'

export const schedulingService = {
  async scheduleAnnouncement(
    announcementData: any,
    scheduledAt: Date,
    expiresAt?: Date
  ) {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .insert({
          ...announcementData,
          status: 'scheduled',
          scheduled_at: scheduledAt.toISOString(),
          expires_at: expiresAt?.toISOString() || null
        })
        .select()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error scheduling announcement:', error)
      throw error
    }
  },

  async updateSchedule(
    announcementId: string,
    scheduledAt?: Date,
    expiresAt?: Date
  ) {
    try {
      const updates: any = {
        updated_at: new Date().toISOString()
      }

      if (scheduledAt) {
        updates.scheduled_at = scheduledAt.toISOString()
        updates.status = 'scheduled'
      }

      if (expiresAt !== undefined) {
        updates.expires_at = expiresAt ? expiresAt.toISOString() : null
      }

      const { data, error } = await supabase
        .from('announcements')
        .update(updates)
        .eq('id', announcementId)
        .select()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating schedule:', error)
      throw error
    }
  },

  async processScheduledAnnouncements() {
    try {
      // This would typically run as a cron job or edge function
      const { error } = await supabase.rpc('process_scheduled_announcements')
      if (error) throw error
    } catch (error) {
      console.error('Error processing scheduled announcements:', error)
    }
  },

  async cancelSchedule(announcementId: string) {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .update({
          status: 'draft',
          scheduled_at: null
        })
        .eq('id', announcementId)
        .select()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error cancelling schedule:', error)
      throw error
    }
  }
}