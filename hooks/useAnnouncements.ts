// hooks/useAnnouncements.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Announcement } from '../types/announcement'

export const useAnnouncements = (
  organizationId: string | undefined,
  userId: string | undefined
) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAnnouncements = useCallback(async () => {
    if (!organizationId) return
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          profiles:author_id (
            username,
            full_name
          ),
          categories:category_id (
            id,
            name,
            color,
            icon
          ),
          attachments:announcement_attachments(*),
          announcement_reads!left(
            id,
            read_at,
            user_id
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      if (data) {
        const announcementsWithDetails = await Promise.all(
          data.map(async (item) => {
            const { data: reactions, error: reactionsError } = await supabase
              .from('announcement_reactions')
              .select('*')
              .eq('announcement_id', item.id)
              .eq('organization_id', organizationId)

            if (reactionsError) {
              console.error('Error fetching reactions:', reactionsError)
            }

            const { data: readReceipt, error: readError } = await supabase
              .from('announcement_reads')
              .select('*')
              .eq('announcement_id', item.id)
              .eq('organization_id', organizationId)
              .eq('user_id', userId)
              .single()

            if (readError && readError.code !== 'PGRST116') {
              console.error('Error fetching read receipt:', readError)
            }

            const { count: readCount, error: countError } = await supabase
              .from('announcement_reads')
              .select('*', { count: 'exact', head: true })
              .eq('announcement_id', item.id)
              .eq('organization_id', organizationId)

            if (countError) {
              console.error('Error fetching read count:', countError)
            }

            const userHasReacted = reactions?.some(r => r.user_id === userId) || false

            return {
              id: item.id,
              title: item.title,
              content: item.content,
              author: item.profiles?.full_name || item.profiles?.username || 'Unknown',
              author_id: item.author_id,
              date: new Date(item.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              }),
              isImportant: item.is_important,
              isPinned: item.is_pinned || false,
              created_at: item.created_at,
              category_id: item.category_id,
              has_attachments: item.has_attachments,
              categories: item.categories,
              attachments: item.attachments || [],
              reactions: reactions || [],
              reaction_count: reactions?.length || 0,
              user_has_reacted: userHasReacted,
              read_receipts: item.announcement_reads,
              is_read: !!readReceipt,
              read_count: readCount || 0
            }
          })
        )

        setAnnouncements(announcementsWithDetails)
      }
    } catch (error) {
      console.error('Error fetching announcements:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [organizationId, userId])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  return { announcements, loading, fetchAnnouncements, setAnnouncements }
}