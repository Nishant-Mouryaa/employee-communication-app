// services/taskAttachmentService.ts
import { supabase } from '../lib/supabase'
import { TaskAttachment, SelectedFile } from '../types/tasks'

export const fetchAttachments = async (
  taskId: string,
  organizationId: string
): Promise<TaskAttachment[]> => {
  const { data, error } = await supabase
    .from('task_attachments')
    .select('*')
    .eq('task_id', taskId)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const uploadAttachment = async (
  file: SelectedFile,
  taskId: string,
  userId: string,
  organizationId: string
): Promise<void> => {
  const response = await fetch(file.uri)
  if (!response.ok) {
    throw new Error('Failed to read selected file')
  }

  const arrayBuffer = await response.arrayBuffer()
  const fileExt = file.name.split('.').pop() || 'file'
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `task-attachments/${taskId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(filePath, arrayBuffer, {
      contentType: file.mimeType || 'application/octet-stream',
      upsert: false
    })

  if (uploadError) throw uploadError

  const { error: dbError } = await supabase
    .from('task_attachments')
    .insert({
      task_id: taskId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.mimeType || 'application/octet-stream',
      uploaded_by: userId,
      organization_id: organizationId,
    })

  if (dbError) {
    await supabase.storage.from('attachments').remove([filePath])
    throw dbError
  }
}

export const downloadAttachment = async (attachment: TaskAttachment): Promise<string> => {
  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(attachment.file_path, 3600)

  if (error) throw error
  if (!data?.signedUrl) throw new Error('Failed to generate download URL')

  return data.signedUrl
}

export const deleteAttachment = async (
  attachmentId: string,
  filePath: string,
  organizationId: string
): Promise<void> => {
  const { error: storageError } = await supabase.storage
    .from('attachments')
    .remove([filePath])

  if (storageError) throw storageError

  const { error: dbError } = await supabase
    .from('task_attachments')
    .delete()
    .eq('id', attachmentId)
    .eq('organization_id', organizationId)

  if (dbError) throw dbError
}

export const deleteAllTaskAttachments = async (
  attachments: TaskAttachment[]
): Promise<void> => {
  if (attachments.length === 0) return

  const filePaths = attachments.map(a => a.file_path)
  await supabase.storage.from('attachments').remove(filePaths)
}