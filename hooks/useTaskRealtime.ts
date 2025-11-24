// hooks/useTaskRealtime.ts
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface UseTaskRealtimeProps {
  userId: string | undefined
  organizationId: string | undefined
  onTasksChange: () => void
  onAttachmentsChange: (taskId: string) => void
  onCommentsChange: (taskId: string) => void
}

export const useTaskRealtime = ({
  userId,
  organizationId,
  onTasksChange,
  onAttachmentsChange,
  onCommentsChange,
}: UseTaskRealtimeProps) => {
  useEffect(() => {
    if (!userId || !organizationId) return

    const tasksSubscription = supabase
      .channel(`tasks-changes-${organizationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `organization_id=eq.${organizationId}` },
        onTasksChange
      )
      .subscribe()

    const attachmentsSubscription = supabase
      .channel(`task-attachments-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_attachments',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          if (payload.new && 'task_id' in payload.new) {
            onAttachmentsChange(payload.new.task_id as string)
          }
        }
      )
      .subscribe()

    const commentsSubscription = supabase
      .channel(`task-comments-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments',
          filter: `organization_id=eq.${organizationId}`,
        },
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
  }, [userId, organizationId, onTasksChange, onAttachmentsChange, onCommentsChange])
}