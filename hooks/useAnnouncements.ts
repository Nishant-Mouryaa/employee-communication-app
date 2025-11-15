// hooks/useAnnouncements.ts
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Announcement } from '../types/announcement'
import { useAuth } from './useAuth'

export const useAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  const fetchAnnouncements = async () => {
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
            read_at
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        const announcementsWithDetails = await Promise.all(
          data.map(async (item) => {
            const { data: reactions } = await supabase
              .from('announcement_reactions')
              .select('*')
              .eq('announcement_id', item.id)

            const { data: readReceipt } = await supabase
              .from('announcement_reads')
              .select('*')
              .eq('announcement_id', item.id)
              .eq('user_id', user?.id)
              .single()

            const { count: readCount } = await supabase
              .from('announcement_reads')
              .select('*', { count: 'exact', head: true })
              .eq('announcement_id', item.id)

            const userHasReacted = reactions?.some(r => r.user_id === user?.id) || false

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
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  return { announcements, loading, fetchAnnouncements, setAnnouncements }
}