// hooks/useRealtimeAnnouncements.ts
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const useRealtimeAnnouncements = (
  organizationId: string | undefined,
  onUpdate: () => void
) => {
  useEffect(() => {
    if (!organizationId) return

    const subscription = supabase
      .channel(`announcements-${organizationId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'announcements',
          filter: `organization_id=eq.${organizationId}`
        },
        onUpdate
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'announcement_reactions',
          filter: `organization_id=eq.${organizationId}`
        },
        onUpdate
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'announcement_reads',
          filter: `organization_id=eq.${organizationId}`
        },
        onUpdate
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [organizationId, onUpdate])
}