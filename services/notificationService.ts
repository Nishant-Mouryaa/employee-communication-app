// services/notificationService.ts
import { supabase } from '../lib/supabase'
import { Platform, Alert } from 'react-native'

// Check if running in Expo Go
const isExpoGo = () => {
  try {
    return Platform.OS === 'android' && 
           typeof navigator !== 'undefined' && 
           navigator.product === 'ReactNative'
  } catch {
    return false
  }
}

// Lazy load modules
let Notifications: any = null
let Constants: any = null

const loadNotificationModules = async () => {
  // Don't load in Expo Go on Android
  if (isExpoGo()) {
    console.log('Push notifications not supported in Expo Go')
    return false
  }

  try {
    if (!Notifications) {
      Notifications = await import('expo-notifications')
      Constants = await import('expo-constants')
      
      // Configure notifications
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      })
    }
    return true
  } catch (error) {
    console.warn('Notifications not available:', error)
    return false
  }
}

export const notificationService = {
  async isAvailable(): Promise<boolean> {
    if (isExpoGo()) {
      return false
    }
    return await loadNotificationModules()
  },

  async registerForPushNotifications(userId: string) {
    const available = await loadNotificationModules()
    if (!available) {
      console.log('Push notifications not available')
      return null
    }

    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('announcements', {
          name: 'Announcements',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#007AFF',
        })
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      if (finalStatus !== 'granted') {
        console.log('Permission not granted for push notifications')
        return null
      }

      // Get project ID safely
      let projectId = null
      try {
        projectId = Constants?.default?.expoConfig?.extra?.eas?.projectId || 
                   Constants?.default?.manifest?.extra?.eas?.projectId ||
                   Constants?.expoConfig?.extra?.eas?.projectId
      } catch (e) {
        console.warn('Could not get project ID:', e)
      }

      if (!projectId) {
        console.warn('No project ID found - notifications will not work')
        return null
      }

      const token = (await Notifications.getExpoPushTokenAsync({
        projectId
      })).data

      // Save token to database
      await supabase
        .from('push_tokens')
        .upsert({
          user_id: userId,
          token,
          platform: Platform.OS,
          last_used_at: new Date().toISOString()
        }, {
          onConflict: 'token'
        })

      return token
    } catch (error) {
      console.error('Error registering for push notifications:', error)
      return null
    }
  },

  async sendNotification(
    userId: string,
    title: string,
    body: string,
    data: any
  ) {
    try {
      const { error } = await supabase
        .from('notification_queue')
        .insert({
          user_id: userId,
          announcement_id: data.announcementId,
          type: data.type || 'announcement',
          title,
          body,
          data
        })

      if (error) throw error
    } catch (error) {
      console.error('Error queuing notification:', error)
    }
  },

  async notifyNewAnnouncement(announcementId: string, title: string) {
    try {
      const { data: settings } = await supabase
        .from('notification_settings')
        .select('user_id, new_announcements, important_only')
        .eq('push_enabled', true)

      if (!settings) return

      for (const setting of settings) {
        if (setting.new_announcements) {
          await this.sendNotification(
            setting.user_id,
            'New Announcement',
            title,
            { type: 'new_announcement', announcementId }
          )
        }
      }
    } catch (error) {
      console.error('Error notifying users:', error)
    }
  },

  async notifyCommentReply(
    userId: string,
    announcementId: string,
    commenterName: string
  ) {
    try {
      const { data: settings } = await supabase
        .from('notification_settings')
        .select('comment_replies, push_enabled')
        .eq('user_id', userId)
        .eq('push_enabled', true)
        .single()

      if (settings?.comment_replies) {
        await this.sendNotification(
          userId,
          'New Reply',
          `${commenterName} replied to your comment`,
          { type: 'comment_reply', announcementId }
        )
      }
    } catch (error) {
      console.error('Error sending reply notification:', error)
    }
  },

  async scheduleNotification(
    title: string,
    body: string,
    scheduledDate: Date,
    data?: any
  ) {
    const available = await loadNotificationModules()
    if (!available) {
      console.log('Cannot schedule notification - not available')
      return null
    }

    try {
      const trigger = new Date(scheduledDate)
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger,
      })

      return notificationId
    } catch (error) {
      console.error('Error scheduling notification:', error)
      return null
    }
  },

  async cancelScheduledNotification(notificationId: string) {
    const available = await loadNotificationModules()
    if (!available) return

    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId)
    } catch (error) {
      console.error('Error cancelling notification:', error)
    }
  }
}