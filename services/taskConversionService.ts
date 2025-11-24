// services/taskConversionService.ts
import { supabase } from '../lib/supabase'
import { Message } from '../types/chat'

export interface TaskFromMessage {
  title: string
  description: string
  assigned_to?: string
  due_date?: string
  priority?: 'low' | 'medium' | 'high'
  status?: 'todo' | 'in-progress' | 'done'
  source_message_id?: string
  source_channel_id?: string
}

/**
 * Convert a message to a task
 */
export const convertMessageToTask = async (
  message: Message,
  userId: string,
  organizationId: string,
  taskData?: Partial<TaskFromMessage>
): Promise<any> => {
  try {
    // Extract task details from message or use provided data
    const title = taskData?.title || 
      (message.content.length > 50 
        ? message.content.substring(0, 50) + '...' 
        : message.content) || 
      'Task from message'
    
    const description = taskData?.description || 
      `Converted from message in ${message.channel_id}\n\nOriginal message:\n${message.content}`

    const task = {
      title: title.trim(),
      description: description.trim(),
      assigned_to: taskData?.assigned_to || userId, // Default to current user
      created_by: userId,
      organization_id: organizationId,
      due_date: taskData?.due_date || null,
      priority: taskData?.priority || 'medium',
      status: (taskData?.status || 'todo') as 'todo' | 'in-progress' | 'done',
      source_message_id: message.id,
      source_channel_id: message.channel_id,
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert([task])
      .select(`
        *,
        assigned_to_profile:assigned_to (username, full_name),
        created_by_profile:created_by (username, full_name)
      `)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error converting message to task:', error)
    throw error
  }
}

/**
 * Get tasks created from messages
 */
export const getTasksFromMessages = async (
  messageIds: string[],
  organizationId: string
): Promise<Map<string, any>> => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, status, source_message_id')
      .in('source_message_id', messageIds)
      .eq('organization_id', organizationId)
      .not('source_message_id', 'is', null)

    if (error) throw error

    const taskMap = new Map()
    data?.forEach(task => {
      if (task.source_message_id) {
        taskMap.set(task.source_message_id, task)
      }
    })

    return taskMap
  } catch (error) {
    console.error('Error fetching tasks from messages:', error)
    return new Map()
  }
}

