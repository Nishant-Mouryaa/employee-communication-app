// types/security.ts
export type UserRole = 'admin' | 'manager' | 'employee' | 'guest'

export type MessageEncryptionLevel = 'none' | 'transport' | 'e2e'

export interface AccessPolicy {
  id: string
  name: string
  description?: string
  allow_cross_department: boolean
  allow_external: boolean
  allowed_departments?: string[]
  restricted_departments?: string[]
  created_at: string
  updated_at: string
}

export interface ChannelAccessControl {
  channel_id: string
  is_private: boolean
  allowed_departments?: string[]
  allowed_roles?: UserRole[]
  requires_approval: boolean
  created_by: string
}

export interface AdminCapabilities {
  can_create_channels: boolean
  can_delete_channels: boolean
  can_manage_users: boolean
  can_view_audit_logs: boolean
  can_export_data: boolean
  can_delete_data: boolean
  can_manage_policies: boolean
}

export interface ComplianceSettings {
  data_retention_days?: number
  auto_delete_enabled: boolean
  encryption_enabled: boolean
  audit_logging_enabled: boolean
  gdpr_compliant: boolean
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  resource_type: string
  resource_id?: string
  details?: Record<string, any>
  ip_address?: string
  created_at: string
}

