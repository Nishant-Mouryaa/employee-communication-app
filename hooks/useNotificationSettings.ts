// hooks/useNotificationSettings.ts
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { NotificationSettings } from '../types/announcement'
import { useAuth } from './useAuth'

export const useNotificationSettings = () => {
  const { user } = useAuth()
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchSettings = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (!data) {
        // Create default settings
        const { data: newSettings, error: createError } = await supabase
          .from('notification_settings')
          .insert({
            user_id: user.id,
            new_announcements: true,
            important_only: false,
            category_filters: [],
            push_enabled: true,
            email_enabled: true,
            comment_replies: true,
            mentions: true
          })
          .select()
          .single()

        if (createError) throw createError
        setSettings(newSettings)
      } else {
        setSettings(data)
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (updates: Partial<NotificationSettings>) => {
    if (!user || !settings) return

    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      setSettings(data)
      return data
    } catch (error) {
      console.error('Error updating notification settings:', error)
      throw error
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [user])

  return { settings, loading, updateSettings, fetchSettings }
}