// hooks/useRealtimeAnnouncements.ts
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const useRealtimeAnnouncements = (onUpdate: () => void) => {
  useEffect(() => {
    const subscription = supabase
      .channel('announcements-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'announcements' 
        },
        (payload) => {
          console.log('Announcements change:', payload)
          onUpdate()
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'announcement_reactions' 
        },
        (payload) => {
          console.log('Reactions change:', payload)
          onUpdate()
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'announcement_reads' 
        },
        (payload) => {
          console.log('Reads change:', payload)
          onUpdate()
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
      })

    return () => {
      subscription.unsubscribe()
    }
  }, [onUpdate])
}