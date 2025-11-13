// services/complianceService.ts
import { supabase } from '../lib/supabase'
import { ComplianceSettings, AuditLog } from '../types/security'

/**
 * Export all user data (GDPR Right to Data Portability)
 */
export const exportUserData = async (userId: string): Promise<{
  profile: any
  messages: any[]
  channels: any[]
  attachments: any[]
}> => {
  try {
    const [profile, messages, channels, attachments] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single(),
      supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId),
      supabase
        .from('channel_members')
        .select('*, channels(*)')
        .eq('user_id', userId),
      supabase
        .from('chat_messages')
        .select('attachments')
        .eq('user_id', userId)
        .not('attachments', 'is', null),
    ])

    return {
      profile: profile.data,
      messages: messages.data || [],
      channels: channels.data || [],
      attachments: (attachments.data || [])
        .flatMap(m => m.attachments || [])
        .filter(Boolean),
    }
  } catch (error) {
    console.error('Error exporting user data:', error)
    throw error
  }
}

/**
 * Delete all user data (GDPR Right to Erasure)
 */
export const deleteUserData = async (userId: string): Promise<void> => {
  try {
    // Delete in order to respect foreign key constraints
    await Promise.all([
      // Delete reactions
      supabase.from('reactions').delete().eq('user_id', userId),
      // Delete read receipts
      supabase.from('chat_message_reads').delete().eq('user_id', userId),
      // Delete messages (soft delete - mark as deleted)
      supabase
        .from('chat_messages')
        .update({ content: '[Deleted]', is_deleted: true })
        .eq('user_id', userId),
      // Remove from channels
      supabase.from('channel_members').delete().eq('user_id', userId),
      // Delete profile
      supabase.from('profiles').delete().eq('id', userId),
    ])

    // Log the deletion
    await logAuditEvent({
      user_id: userId,
      action: 'data_deletion',
      resource_type: 'user',
      resource_id: userId,
      details: { reason: 'GDPR request' },
    })
  } catch (error) {
    console.error('Error deleting user data:', error)
    throw error
  }
}

/**
 * Apply data retention policy
 */
export const applyDataRetention = async (
  retentionDays: number
): Promise<number> => {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    // Delete old messages
    const { data: deletedMessages } = await supabase
      .from('chat_messages')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id')

    const deletedCount = deletedMessages?.length || 0

    // Log retention action
    await logAuditEvent({
      user_id: 'system',
      action: 'data_retention',
      resource_type: 'messages',
      details: {
        retention_days: retentionDays,
        deleted_count: deletedCount,
        cutoff_date: cutoffDate.toISOString(),
      },
    })

    return deletedCount
  } catch (error) {
    console.error('Error applying data retention:', error)
    throw error
  }
}

/**
 * Log audit event
 */
export const logAuditEvent = async (log: Omit<AuditLog, 'id' | 'created_at'>): Promise<void> => {
  try {
    await supabase.from('audit_logs').insert([
      {
        ...log,
        created_at: new Date().toISOString(),
      },
    ])
  } catch (error) {
    console.error('Error logging audit event:', error)
    // Don't throw - audit logging failures shouldn't break the app
  }
}

/**
 * Get compliance settings
 */
export const getComplianceSettings = async (): Promise<ComplianceSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('compliance_settings')
      .select('*')
      .single()

    if (error) {
      console.error('Error fetching compliance settings:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getComplianceSettings:', error)
    return null
  }
}

/**
 * Update compliance settings (admin only)
 */
export const updateComplianceSettings = async (
  settings: Partial<ComplianceSettings>
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('compliance_settings')
      .upsert(settings, { onConflict: 'id' })

    if (error) throw error

    await logAuditEvent({
      user_id: 'system',
      action: 'compliance_settings_updated',
      resource_type: 'settings',
      details: settings,
    })
  } catch (error) {
    console.error('Error updating compliance settings:', error)
    throw error
  }
}

/**
 * Get audit logs (admin only)
 */
export const getAuditLogs = async (
  limit: number = 100,
  offset: number = 0
): Promise<AuditLog[]> => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return []
  }
}

