// services/taskCommentService.ts
import { supabase } from '../lib/supabase'
import { TaskComment } from '../types/tasks'

export const fetchComments = async (taskId: string): Promise<TaskComment[]> => {
  const { data: commentsData, error: commentsError } = await supabase
    .from('task_comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (commentsError) throw commentsError

  if (!commentsData || commentsData.length === 0) {
    return []
  }

  const userIds = [...new Set(commentsData.map(c => c.user_id))]
  
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .in('id', userIds)

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError)
    return commentsData
  }

  const profilesMap = new Map(
    profilesData?.map(profile => [profile.id, profile]) || []
  )

  return commentsData.map(comment => ({
    ...comment,
    user_profile: profilesMap.get(comment.user_id) || {
      username: 'Unknown',
      full_name: 'Unknown User',
      avatar_url: ''
    }
  }))
}

export const addComment = async (
  taskId: string,
  userId: string,
  comment: string
): Promise<void> => {
  const { error } = await supabase
    .from('task_comments')
    .insert({
      task_id: taskId,
      user_id: userId,
      comment: comment.trim()
    })

  if (error) throw error
}

export const deleteComment = async (commentId: string): Promise<void> => {
  const { error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', commentId)

  if (error) throw error
}