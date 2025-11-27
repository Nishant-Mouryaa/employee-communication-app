// services/complianceService.ts
import { supabase } from '../lib/supabase'
import { ComplianceSettings, AuditLog } from '../types/security'

/**
 * Export all user data (GDPR Right to Data Portability)
 */
export const exportUserData = async (
  userId: string,
  organizationId: string
): Promise<{
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
        .eq('organization_id', organizationId)
        .single(),
      supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', organizationId),
      supabase
        .from('channel_members')
        .select('*, channels(*)')
        .eq('user_id', userId)
        .eq('organization_id', organizationId),
      supabase
        .from('chat_messages')
        .select('attachments')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
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
export const deleteUserData = async (userId: string, organizationId: string): Promise<void> => {
  try {
    // Delete in order to respect foreign key constraints
    await Promise.all([
      // Delete reactions
      supabase.from('reactions').delete().eq('user_id', userId).eq('organization_id', organizationId),
      // Delete read receipts
      supabase.from('chat_message_reads').delete().eq('user_id', userId).eq('organization_id', organizationId),
      // Delete messages (soft delete - mark as deleted)
      supabase
        .from('chat_messages')
        .update({ content: '[Deleted]', is_deleted: true })
        .eq('user_id', userId)
        .eq('organization_id', organizationId),
      // Remove from channels
      supabase.from('channel_members').delete().eq('user_id', userId).eq('organization_id', organizationId),
      // Delete profile
      supabase.from('profiles').delete().eq('id', userId).eq('organization_id', organizationId),
    ])

    // Log the deletion
    await logAuditEvent({
      user_id: userId,
      action: 'data_deletion',
      resource_type: 'user',
      resource_id: userId,
      organization_id: organizationId,
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
  retentionDays: number,
  organizationId: string
): Promise<number> => {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    // Delete old messages
    const { data: deletedMessages } = await supabase
      .from('chat_messages')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .eq('organization_id', organizationId)
      .select('id')

    const deletedCount = deletedMessages?.length || 0

    // Log retention action
    await logAuditEvent({
      user_id: 'system',
      action: 'data_retention',
      resource_type: 'messages',
      organization_id: organizationId,
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



/**
 * Get compliance settings
 */
export const getComplianceSettings = async (
  organizationId: string
): Promise<ComplianceSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('compliance_settings')
      .select('*')
      .eq('organization_id', organizationId)
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
  settings: Partial<ComplianceSettings>,
  organizationId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('compliance_settings')
      .upsert(
        {
          ...settings,
          organization_id: organizationId,
        },
        { onConflict: 'id' }
      )

    if (error) throw error

    await logAuditEvent({
      user_id: 'system',
      action: 'compliance_settings_updated',
      resource_type: 'settings',
      organization_id: organizationId,
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
  organizationId: string,
  limit: number = 100,
  offset: number = 0
): Promise<AuditLog[]> => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return []
  }
}



/**
 * Log audit event - FIXED VERSION
 */
export const logAuditEvent = async (
  log: Omit<AuditLog, 'id' | 'created_at'> & { organization_id: string }
): Promise<void> => {
  try {
    console.log('🔍 [AUDIT_LOG] Attempting to log:', {
      action: log.action,
      user_id: log.user_id,
      organization_id: log.organization_id,
      resource_type: log.resource_type
    })

    // Validate required fields BEFORE building the object
    if (!log.organization_id) {
      console.error('❌ [AUDIT_LOG] Missing organization_id:', log)
      return // Silently fail but log the error
    }

    if (!log.action) {
      console.error('❌ [AUDIT_LOG] Missing action:', log)
      return
    }

    if (!log.resource_type) {
      console.error('❌ [AUDIT_LOG] Missing resource_type:', log)
      return
    }

    // Build audit data with explicit field mapping
    const auditData = {
      user_id: log.user_id || 'system',
      action: log.action,
      resource_type: log.resource_type,
      resource_id: log.resource_id || null,
      details: log.details || null,
      ip_address: log.ip_address || null,
      organization_id: log.organization_id, // This MUST be present
      created_at: new Date().toISOString(),
    }

    console.log('📝 [AUDIT_LOG] Inserting data:', auditData)

    // Double-check before insert
    if (!auditData.organization_id) {
      console.error('❌ [AUDIT_LOG] organization_id is null in final data object!')
      return
    }

    const { error, data } = await supabase
      .from('audit_logs')
      .insert([auditData])
      .select()

    if (error) {
      console.error('❌ [AUDIT_LOG] Database error:', error)
      console.error('❌ [AUDIT_LOG] Failed data:', auditData)
    } else {
      console.log('✅ [AUDIT_LOG] Successfully logged:', data)
    }

  } catch (error) {
    console.error('💥 [AUDIT_LOG] Unexpected error:', error)
    // Don't throw - audit logging failures shouldn't break the app
  }
}

export const safeLogAuditEvent = async (
  log: Omit<AuditLog, 'id' | 'created_at'> & { organization_id: string }
) => {
  // Extra validation layer
  if (!log.organization_id) {
    console.warn('⚠️ [AUDIT_LOG] Missing organization_id in safeLogAuditEvent, skipping')
    console.warn('⚠️ [AUDIT_LOG] Log object:', log)
    return
  }
  
  await logAuditEvent(log)
}
