// services/taskService.ts
import { supabase } from '../lib/supabase'
import { Task, TaskWithLabels, TaskFilter, NewTaskForm } from '../types/tasks'

export const fetchTasks = async (filter: TaskFilter = 'all'): Promise<TaskWithLabels[]> => {
  let query = supabase
    .from('tasks')
    .select(`
      *,
      assigned_to_profile:assigned_to (username, full_name),
      created_by_profile:created_by (username, full_name)
    `)
    .order('created_at', { ascending: false })

  if (filter !== 'all') {
    query = query.eq('status', filter)
  }

  const { data, error } = await query

  if (error) throw error

  // Fetch labels for each task
  const tasksWithLabels = await Promise.all(
    (data || []).map(async (task) => {
      const { data: labelData } = await supabase
        .from('task_label_assignments')
        .select(`
          label_id,
          task_labels:label_id (id, name, color)
        `)
        .eq('task_id', task.id)

      const labels = labelData?.map(l => l.task_labels).filter(Boolean) || []
      return { ...task, labels }
    })
  )

  return tasksWithLabels
}

export const createTask = async (
  taskData: NewTaskForm,
  userId: string
): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .insert([{
      title: taskData.title.trim(),
      description: taskData.description.trim(),
      assigned_to: taskData.assigned_to || userId,
      created_by: userId,
      due_date: taskData.due_date.toISOString().split('T')[0],
      priority: taskData.priority,
      status: 'todo' as const
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateTaskStatus = async (
  taskId: string,
  status: Task['status']
): Promise<void> => {
  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId)

  if (error) throw error
}

export const deleteTask = async (taskId: string): Promise<void> => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) throw error
}