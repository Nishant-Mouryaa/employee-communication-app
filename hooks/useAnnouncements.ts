// hooks/useAnnouncements.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Announcement } from '../types/announcement'
import { useAuth } from './useAuth'

export const useAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  // Use useCallback to prevent unnecessary re-renders
  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true)
      console.log('Fetching announcements...')
      
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

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      if (data) {
        console.log(`Fetched ${data.length} announcements`)
        
        const announcementsWithDetails = await Promise.all(
          data.map(async (item) => {
            // Fetch reactions
            const { data: reactions, error: reactionsError } = await supabase
              .from('announcement_reactions')
              .select('*')
              .eq('announcement_id', item.id)

            if (reactionsError) {
              console.error('Error fetching reactions:', reactionsError)
            }

            // Fetch user's read receipt
            const { data: readReceipt, error: readError } = await supabase
              .from('announcement_reads')
              .select('*')
              .eq('announcement_id', item.id)
              .eq('user_id', user?.id)
              .single()

            if (readError && readError.code !== 'PGRST116') {
              console.error('Error fetching read receipt:', readError)
            }

            // Fetch read count
            const { count: readCount, error: countError } = await supabase
              .from('announcement_reads')
              .select('*', { count: 'exact', head: true })
              .eq('announcement_id', item.id)

            if (countError) {
              console.error('Error fetching read count:', countError)
            }

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
  }, [user?.id]) // Add user.id as dependency

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  return { announcements, loading, fetchAnnouncements, setAnnouncements }
}