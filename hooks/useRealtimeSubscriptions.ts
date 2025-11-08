// hooks/useRealtimeSubscriptions.ts
import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeSubscriptionsProps {
  userId: string | undefined
  onMessageChange: () => void
  onTaskChange: () => void
  onAnnouncementChange: () => void
}

export const useRealtimeSubscriptions = ({
  userId,
  onMessageChange,
  onTaskChange,
  onAnnouncementChange
}: UseRealtimeSubscriptionsProps) => {
  const subscriptionsRef = useRef<RealtimeChannel[]>([])

  useEffect(() => {
    if (!userId) return

    const messagesSubscription = supabase
      .channel(`home-messages-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        onMessageChange
      )
      .subscribe()

    const readsSubscription = supabase
      .channel(`home-reads-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_message_reads',
          filter: `user_id=eq.${userId}`
        },
        onMessageChange
      )
      .subscribe()

    const tasksSubscription = supabase
      .channel(`home-tasks-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `assigned_to=eq.${userId}`
        },
        onTaskChange
      )
      .subscribe()

    const announcementsSubscription = supabase
      .channel(`home-announcements-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        onAnnouncementChange
      )
      .subscribe()

    subscriptionsRef.current = [
      messagesSubscription,
      readsSubscription,
      tasksSubscription,
      announcementsSubscription
    ]

    return () => {
      subscriptionsRef.current.forEach(sub => {
        supabase.removeChannel(sub)
      })
    }
  }, [userId, onMessageChange, onTaskChange, onAnnouncementChange])
}