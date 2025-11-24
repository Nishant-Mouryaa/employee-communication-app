// services/commentService.ts
import { supabase } from '../lib/supabase'
import { Alert } from 'react-native'

export const commentService = {
  async createComment(
    announcementId: string,
    userId: string,
    content: string,
    organizationId: string,
    parentId?: string
  ) {
    try {
      const { data, error } = await supabase
        .from('announcement_comments')
        .insert({
          announcement_id: announcementId,
          user_id: userId,
          content: content.trim(),
          parent_id: parentId || null,
          organization_id: organizationId,
        })
        .select(`
          *,
          profiles:user_id (
            username,
            full_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating comment:', error)
      throw error
    }
  },

  async updateComment(commentId: string, content: string, organizationId: string) {
    try {
      const { data, error } = await supabase
        .from('announcement_comments')
        .update({
          content: content.trim(),
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating comment:', error)
      throw error
    }
  },

  async deleteComment(commentId: string, organizationId: string) {
    try {
      const { error } = await supabase
        .from('announcement_comments')
        .delete()
        .eq('id', commentId)
        .eq('organization_id', organizationId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting comment:', error)
      throw error
    }
  },

  async reportComment(commentId: string, reason: string) {
    // Implement reporting logic
    Alert.alert('Success', 'Comment reported successfully')
  }
}