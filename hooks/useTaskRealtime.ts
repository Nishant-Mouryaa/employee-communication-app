// hooks/useTaskRealtime.ts
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface UseTaskRealtimeProps {
  userId: string | undefined
  onTasksChange: () => void
  onAttachmentsChange: (taskId: string) => void
  onCommentsChange: (taskId: string) => void
}

export const useTaskRealtime = ({
  userId,
  onTasksChange,
  onAttachmentsChange,
  onCommentsChange
}: UseTaskRealtimeProps) => {
  useEffect(() => {
    if (!userId) return

    const tasksSubscription = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        onTasksChange
      )
      .subscribe()

    const attachmentsSubscription = supabase
      .channel('attachments-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_attachments' },
        (payload) => {
          if (payload.new && 'task_id' in payload.new) {
            onAttachmentsChange(payload.new.task_id as string)
          }
        }
      )
      .subscribe()

    const commentsSubscription = supabase
      .channel('comments-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_comments' },
        (payload) => {
          if (payload.new && 'task_id' in payload.new) {
            onCommentsChange(payload.new.task_id as string)
          }
        }
      )
      .subscribe()

    return () => {
      tasksSubscription.unsubscribe()
      attachmentsSubscription.unsubscribe()
      commentsSubscription.unsubscribe()
    }
  }, [userId, onTasksChange, onAttachmentsChange, onCommentsChange])
}