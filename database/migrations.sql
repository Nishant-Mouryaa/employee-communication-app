-- Security and Admin Features Database Migration
-- Run this SQL in your Supabase SQL Editor

-- 1. Add role column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee', 'guest'));

-- 2. Add encryption fields to chat_messages
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS encryption_key TEXT;

-- 3. Create access_policies table
CREATE TABLE IF NOT EXISTS access_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Default Policy',
  description TEXT,
  allow_cross_department BOOLEAN DEFAULT false,
  allow_external BOOLEAN DEFAULT false,
  allowed_departments TEXT[],
  restricted_departments TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create channel_access_control table
CREATE TABLE IF NOT EXISTS channel_access_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  is_private BOOLEAN DEFAULT false,
  allowed_departments TEXT[],
  allowed_roles TEXT[] CHECK (allowed_roles <@ ARRAY['admin', 'manager', 'employee', 'guest']),
  requires_approval BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id)
);

-- 5. Create compliance_settings table
CREATE TABLE IF NOT EXISTS compliance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_retention_days INTEGER DEFAULT 365,
  auto_delete_enabled BOOLEAN DEFAULT false,
  encryption_enabled BOOLEAN DEFAULT false,
  audit_logging_enabled BOOLEAN DEFAULT true,
  gdpr_compliant BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default compliance settings
INSERT INTO compliance_settings (id) 
VALUES (gen_random_uuid())
ON CONFLICT (id) DO NOTHING;

-- 6. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_channel_access_control_channel_id ON channel_access_control(channel_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_encrypted ON chat_messages(is_encrypted);

-- 8. Enable Row Level Security (RLS) on new tables
ALTER TABLE access_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_access_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for access_policies (admins only)
CREATE POLICY "Admins can manage access policies"
ON access_policies
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 10. RLS Policies for channel_access_control
CREATE POLICY "Users can view channel access control for accessible channels"
ON channel_access_control
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_members.channel_id = channel_access_control.channel_id
    AND channel_members.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can manage channel access"
ON channel_access_control
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- 11. RLS Policies for compliance_settings (admins only)
CREATE POLICY "Admins can view compliance settings"
ON compliance_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update compliance settings"
ON compliance_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 12. RLS Policies for audit_logs (admins only)
CREATE POLICY "Admins can view audit logs"
ON audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "System can insert audit logs"
ON audit_logs
FOR INSERT
WITH CHECK (true);

-- 13. Secure file storage: Update storage bucket policies
-- Note: Run these in Supabase Storage settings or via SQL

-- Ensure chat-attachments bucket exists and has proper policies
-- (This should be done via Supabase Dashboard > Storage)

-- 14. Function to automatically log channel creation
CREATE OR REPLACE FUNCTION log_channel_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (
    NEW.created_by,
    'channel_created',
    'channel',
    NEW.id,
    jsonb_build_object('name', NEW.name, 'description', NEW.description)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_channel_creation
AFTER INSERT ON channels
FOR EACH ROW
EXECUTE FUNCTION log_channel_creation();

-- 15. Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_access_policies_updated_at
BEFORE UPDATE ON access_policies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_settings_updated_at
BEFORE UPDATE ON compliance_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 16. Grant necessary permissions
-- Note: Adjust based on your Supabase setup
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON access_policies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON channel_access_control TO authenticated;
GRANT SELECT, INSERT, UPDATE ON compliance_settings TO authenticated;
GRANT SELECT, INSERT ON audit_logs TO authenticated;

