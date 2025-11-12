import { supabase } from '../lib/supabase'
import { MessageAttachment, PendingAttachment } from '../types/chat'

const ATTACHMENT_BUCKET = 'chat-attachments'

const sanitizeFileName = (name: string) => {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .slice(0, 100) || `attachment-${Date.now()}`
}

const ensureExtension = (name: string, mimeType?: string) => {
  if (name.includes('.')) return name
  if (!mimeType) return `${name}.bin`
  const ext = mimeType.split('/')[1]
  return ext ? `${name}.${ext}` : `${name}.bin`
}

const buildStoragePath = (channelId: string, userId: string, fileName: string) => {
  const timestamp = Date.now()
  return `${channelId}/${userId}/${timestamp}-${fileName}`
}

export const uploadPendingAttachments = async (
  attachments: PendingAttachment[],
  channelId: string,
  userId: string
): Promise<MessageAttachment[]> => {
  if (attachments.length === 0) return []

  const uploads = await Promise.all(
    attachments.map(async (attachment, index) => {
      const originalName = attachment.name || `attachment-${index}`
      const safeName = sanitizeFileName(originalName)
      const finalName = ensureExtension(safeName, attachment.mime_type)
      const storagePath = buildStoragePath(channelId, userId, finalName)

      const response = await fetch(attachment.uri)
      if (!response.ok) {
        throw new Error(`Failed to read attachment: ${attachment.name || attachment.uri}`)
      }

      const fileArrayBuffer = response.arrayBuffer
        ? await response.arrayBuffer()
        : null
      if (!fileArrayBuffer) {
        throw new Error('Unable to read attachment data')
      }

      const { data, error } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .upload(storagePath, fileArrayBuffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: attachment.mime_type || 'application/octet-stream',
        })

      if (error) {
        throw error
      }

      const { data: publicUrlData } = supabase.storage
        .from(ATTACHMENT_BUCKET)
        .getPublicUrl(data.path)

      return {
        id: data.path,
        name: originalName,
        url: publicUrlData.publicUrl,
        type: attachment.type,
        mime_type: attachment.mime_type,
        size: attachment.size ?? fileArrayBuffer.byteLength,
      } as MessageAttachment
    })
  )

  return uploads
}

