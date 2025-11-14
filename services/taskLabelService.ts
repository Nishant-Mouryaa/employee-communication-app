// services/taskLabelService.ts
import { supabase } from '../lib/supabase'
import { TaskLabel } from '../types/tasks'

export const fetchLabels = async (): Promise<TaskLabel[]> => {
  const { data, error } = await supabase
    .from('task_labels')
    .select('*')
    .order('name')

  if (error) throw error
  return data || []
}

export const assignLabelToTask = async (
  taskId: string,
  labelId: string
): Promise<void> => {
  const { error } = await supabase
    .from('task_label_assignments')
    .insert({ task_id: taskId, label_id: labelId })

  if (error) throw error
}

export const removeLabelFromTask = async (
  taskId: string,
  labelId: string
): Promise<void> => {
  const { error } = await supabase
    .from('task_label_assignments')
    .delete()
    .eq('task_id', taskId)
    .eq('label_id', labelId)

  if (error) throw error
}

export const assignLabelsToTask = async (
  taskId: string,
  labelIds: string[]
): Promise<void> => {
  if (labelIds.length === 0) return

  const labelAssignments = labelIds.map(labelId => ({
    task_id: taskId,
    label_id: labelId
  }))

  const { error } = await supabase
    .from('task_label_assignments')
    .insert(labelAssignments)

  if (error) throw error
}