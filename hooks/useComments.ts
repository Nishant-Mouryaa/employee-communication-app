// hooks/useComments.ts
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Comment } from '../types/announcement'

export const useComments = (announcementId: string, organizationId: string | undefined) => {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)

  const fetchComments = async () => {
    if (!organizationId) return
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('announcement_comments')
        .select(`
          *,
          profiles:user_id (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('announcement_id', announcementId)
        .eq('organization_id', organizationId)
        .is('parent_id', null)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch replies for each comment
      const commentsWithReplies = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: replies } = await supabase
            .from('announcement_comments')
            .select(`
              *,
              profiles:user_id (
                username,
                full_name,
                avatar_url
              )
            `)
            .eq('parent_id', comment.id)
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: true })

          return {
            ...comment,
            replies: replies || [],
            reply_count: replies?.length || 0,
            is_edited: !!comment.updated_at
          }
        })
      )

      setComments(commentsWithReplies)
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (announcementId && organizationId) {
      fetchComments()
    }
  }, [announcementId, organizationId])

  return { comments, loading, fetchComments }
}