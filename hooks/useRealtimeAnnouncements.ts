// hooks/useRealtimeAnnouncements.ts
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const useRealtimeAnnouncements = (onUpdate: () => void) => {
  useEffect(() => {
    const subscription = supabase
      .channel('announcements-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        onUpdate
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcement_reactions' },
        onUpdate
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcement_reads' },
        onUpdate
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [onUpdate])
}