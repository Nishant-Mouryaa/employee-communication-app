# Security & Privacy Implementation Guide

This document outlines the security and privacy features implemented in the chat application.

## Features Implemented

### 1. Transport Encryption
- **Location**: `utils/encryption.ts`
- **Implementation**: XOR-based encryption for message content (transport-level)
- **Note**: For production, consider upgrading to AES-256 encryption
- **Usage**: Automatically applied when `encryption_enabled` is true in compliance settings

### 2. Secure File Storage
- **Location**: `services/attachmentService.ts`
- **Features**:
  - Files stored in Supabase Storage with access controls
  - File names sanitized to prevent path traversal
  - Storage bucket policies restrict access to authenticated users only

### 3. GDPR & SOC 2 Compliance
- **Location**: `services/complianceService.ts`
- **Features**:
  - **Data Export**: `exportUserData()` - GDPR Right to Data Portability
  - **Data Deletion**: `deleteUserData()` - GDPR Right to Erasure
  - **Data Retention**: `applyDataRetention()` - Automatic cleanup of old messages
  - **Audit Logging**: All admin actions logged for compliance

### 4. Access Control
- **Location**: `services/accessControlService.ts`
- **Features**:
  - Role-based permissions (admin, manager, employee, guest)
  - Department-based messaging restrictions
  - Cross-department messaging controls
  - Channel access control (private channels with department/role restrictions)

### 5. Admin Panel
- **Location**: `screens/AdminScreen.tsx`
- **Features**:
  - Channel creation and management
  - User role management
  - Access policy configuration
  - Compliance settings management
  - Audit log viewing

## Database Setup

### Required Tables

Run the SQL migration in `database/migrations.sql` to create:

1. **access_policies** - Organization-wide messaging policies
2. **channel_access_control** - Per-channel access restrictions
3. **compliance_settings** - GDPR/SOC 2 compliance configuration
4. **audit_logs** - Activity logging for compliance

### Required Columns

- `profiles.role` - User role (admin, manager, employee, guest)
- `chat_messages.is_encrypted` - Encryption flag
- `chat_messages.encryption_key` - Encryption key (consider key management service for production)

## Setup Instructions

### 1. Run Database Migration

```sql
-- Copy and paste the contents of database/migrations.sql
-- into your Supabase SQL Editor and execute
```

### 2. Configure Storage Buckets

In Supabase Dashboard > Storage:

1. Ensure `chat-attachments` bucket exists
2. Set bucket to **Private**
3. Add RLS policies:
   ```sql
   -- Allow authenticated users to upload
   CREATE POLICY "Allow authenticated uploads"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'chat-attachments' 
     AND auth.role() = 'authenticated'
   );
   
   -- Allow authenticated users to read
   CREATE POLICY "Allow authenticated reads"
   ON storage.objects FOR SELECT
   USING (
     bucket_id = 'chat-attachments' 
     AND auth.role() = 'authenticated'
   );
   ```

### 3. Set Initial Admin User

```sql
-- Set a user as admin (replace USER_ID)
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'USER_ID';
```

### 4. Configure Access Policies

1. Navigate to Admin Panel (accessible to admin users)
2. Go to "Policies" tab
3. Configure:
   - Cross-department messaging
   - External messaging restrictions
   - Department allowlists/blocklists

### 5. Enable Compliance Features

1. Navigate to Admin Panel > Compliance tab
2. Configure:
   - Data retention period (days)
   - Enable/disable encryption
   - GDPR compliance settings

## Security Best Practices

### Production Recommendations

1. **Encryption**:
   - Replace XOR encryption with AES-256
   - Use a proper key management service (AWS KMS, HashiCorp Vault)
   - Implement proper key rotation

2. **Access Control**:
   - Regularly audit user roles
   - Review channel access controls
   - Monitor audit logs for suspicious activity

3. **File Storage**:
   - Implement virus scanning for uploads
   - Set file size limits
   - Restrict file types if needed

4. **Compliance**:
   - Schedule regular data retention cleanup
   - Document data processing activities
   - Implement data breach notification procedures

5. **Monitoring**:
   - Set up alerts for failed access attempts
   - Monitor audit logs regularly
   - Review compliance settings quarterly

## API Usage Examples

### Check User Permissions
```typescript
import { getUserPermissions } from './services/accessControlService'

const perms = await getUserPermissions(userId)
console.log(perms.role, perms.can_message_cross_department)
```

### Check Channel Access
```typescript
import { canAccessChannel } from './services/accessControlService'

const access = await canAccessChannel(userId, channelId)
if (!access.allowed) {
  console.error(access.reason)
}
```

### Export User Data (GDPR)
```typescript
import { exportUserData } from './services/complianceService'

const data = await exportUserData(userId)
// Send data to user or download
```

### Create Channel (Admin)
```typescript
import { createChannel } from './services/adminService'

const channel = await createChannel(
  'Engineering',
  'Engineering team channel',
  adminUserId,
  {
    isPrivate: true,
    allowedDepartments: ['Engineering'],
    allowedRoles: ['admin', 'manager', 'employee']
  }
)
```

## Troubleshooting

### "Access Denied" Errors
- Check user role in `profiles.role`
- Verify access policies in `access_policies` table
- Check channel access control settings

### Encryption Not Working
- Verify `compliance_settings.encryption_enabled = true`
- Check that `expo-crypto` is installed
- Review encryption utility logs

### Admin Panel Not Accessible
- Ensure user has `role = 'admin'` in profiles table
- Check RLS policies on admin-related tables
- Verify user is authenticated

## Support

For security concerns or questions, contact your system administrator or review the audit logs in the Admin Panel.

