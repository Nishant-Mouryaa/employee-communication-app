// services/taskLabelService.ts
import { supabase } from '../lib/supabase'
import { TaskLabel } from '../types/tasks'

export const fetchLabels = async (organizationId: string): Promise<TaskLabel[]> => {
  const { data, error } = await supabase
    .from('task_labels')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name')

  if (error) throw error
  return data || []
}

export const assignLabelToTask = async (
  taskId: string,
  labelId: string,
  organizationId: string
): Promise<void> => {
  const { error } = await supabase
    .from('task_label_assignments')
    .insert({ task_id: taskId, label_id: labelId, organization_id: organizationId })

  if (error) throw error
}

export const removeLabelFromTask = async (
  taskId: string,
  labelId: string,
  organizationId: string
): Promise<void> => {
  const { error } = await supabase
    .from('task_label_assignments')
    .delete()
    .eq('task_id', taskId)
    .eq('label_id', labelId)
    .eq('organization_id', organizationId)

  if (error) throw error
}

export const assignLabelsToTask = async (
  taskId: string,
  labelIds: string[],
  organizationId: string
): Promise<void> => {
  if (labelIds.length === 0) return

  const labelAssignments = labelIds.map(labelId => ({
    task_id: taskId,
    label_id: labelId,
    organization_id: organizationId,
  }))

  const { error } = await supabase
    .from('task_label_assignments')
    .insert(labelAssignments)

  if (error) throw error
}