-- database/migrations_multitenant.sql
-- Multi-tenant enablement for chat app
-- 1) Creates organizations table
-- 2) Adds organization_id to core tables
-- 3) Seeds existing data into a default organization
-- 4) Tightens Row Level Security to tenant scope

-- 1. Organizations table -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  plan TEXT DEFAULT 'standard',
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organizations_slug_lower_idx
  ON public.organizations (lower(slug));

-- Ensure at least one organization exists so legacy rows can be attached
DO $$
DECLARE
  default_org_id UUID;
BEGIN
  SELECT id INTO default_org_id FROM public.organizations ORDER BY created_at LIMIT 1;

  IF default_org_id IS NULL THEN
    INSERT INTO public.organizations (name, slug)
    VALUES ('Default Organization', 'default')
    RETURNING id INTO default_org_id;
  END IF;

  PERFORM set_config('app.default_organization_id', default_org_id::text, false);
END $$;

-- Helper function to read default org id inside same migration
CREATE OR REPLACE FUNCTION public.get_default_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('app.default_organization_id', true)::uuid,
    (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
  )
$$;

-- 2. Add organization_id columns ---------------------------------------------
-- Profiles first so other tables can reference it
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.profiles
SET organization_id = COALESCE(organization_id, public.get_default_organization_id());

ALTER TABLE public.profiles
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_organization_idx
  ON public.profiles (organization_id);

-- Channels inherit organization from creator
ALTER TABLE public.channels
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.channels c
SET organization_id = COALESCE(
  c.organization_id,
  p.organization_id,
  public.get_default_organization_id()
)
FROM public.profiles p
WHERE c.created_by = p.id;

UPDATE public.channels
SET organization_id = COALESCE(organization_id, public.get_default_organization_id());

ALTER TABLE public.channels
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS channels_organization_idx
  ON public.channels (organization_id);

-- Channel members share the channel org
ALTER TABLE public.channel_members
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.channel_members cm
SET organization_id = COALESCE(
  cm.organization_id,
  c.organization_id,
  public.get_default_organization_id()
)
FROM public.channels c
WHERE cm.channel_id = c.id;

ALTER TABLE public.channel_members
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS channel_members_org_idx
  ON public.channel_members (organization_id);

-- Chat messages follow their channel
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.chat_messages m
SET organization_id = COALESCE(
  m.organization_id,
  c.organization_id,
  public.get_default_organization_id()
)
FROM public.channels c
WHERE m.channel_id = c.id;

ALTER TABLE public.chat_messages
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS chat_messages_org_idx
  ON public.chat_messages (organization_id);

-- Read receipts
ALTER TABLE public.chat_message_reads
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.chat_message_reads r
SET organization_id = COALESCE(
  r.organization_id,
  m.organization_id,
  public.get_default_organization_id()
)
FROM public.chat_messages m
WHERE r.message_id = m.id;

ALTER TABLE public.chat_message_reads
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS chat_message_reads_org_idx
  ON public.chat_message_reads (organization_id);

-- Reactions
ALTER TABLE public.message_reactions
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.message_reactions mr
SET organization_id = COALESCE(
  mr.organization_id,
  m.organization_id,
  public.get_default_organization_id()
)
FROM public.chat_messages m
WHERE mr.message_id = m.id;

ALTER TABLE public.message_reactions
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS message_reactions_org_idx
  ON public.message_reactions (organization_id);

-- Bookmarks
ALTER TABLE public.message_bookmarks
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.message_bookmarks b
SET organization_id = COALESCE(
  b.organization_id,
  m.organization_id,
  public.get_default_organization_id()
)
FROM public.chat_messages m
WHERE b.message_id = m.id;

ALTER TABLE public.message_bookmarks
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS message_bookmarks_org_idx
  ON public.message_bookmarks (organization_id);

-- Channel access control
ALTER TABLE public.channel_access_control
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.channel_access_control cac
SET organization_id = COALESCE(
  cac.organization_id,
  c.organization_id,
  public.get_default_organization_id()
)
FROM public.channels c
WHERE cac.channel_id = c.id;

ALTER TABLE public.channel_access_control
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS channel_access_control_org_idx
  ON public.channel_access_control (organization_id);

-- Tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.tasks t
SET organization_id = COALESCE(
  t.organization_id,
  creator.organization_id,
  assignee.organization_id,
  public.get_default_organization_id()
)
FROM public.profiles creator
LEFT JOIN public.profiles assignee ON assignee.id = t.assigned_to
WHERE t.created_by = creator.id;

ALTER TABLE public.tasks
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS tasks_org_idx
  ON public.tasks (organization_id);

-- Meetings
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.meetings mt
SET organization_id = COALESCE(
  mt.organization_id,
  creator.organization_id,
  c.organization_id,
  public.get_default_organization_id()
)
FROM public.profiles creator
LEFT JOIN public.channels c ON c.id = mt.channel_id
WHERE mt.created_by = creator.id;

ALTER TABLE public.meetings
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS meetings_org_idx
  ON public.meetings (organization_id);

-- Meeting attendees
ALTER TABLE public.meeting_attendees
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.meeting_attendees ma
SET organization_id = COALESCE(
  ma.organization_id,
  mt.organization_id,
  public.get_default_organization_id()
)
FROM public.meetings mt
WHERE ma.meeting_id = mt.id;

ALTER TABLE public.meeting_attendees
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS meeting_attendees_org_idx
  ON public.meeting_attendees (organization_id);

-- Cleanup helper
DROP FUNCTION IF EXISTS public.get_default_organization_id;

-- 3. Tenant-aware policies ----------------------------------------------------
-- Helper view to read current user's org
CREATE OR REPLACE VIEW public.current_user_organization AS
  SELECT p.id AS user_id, p.organization_id
  FROM public.profiles p
  WHERE p.id = auth.uid();

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users view org profiles" ON public.profiles
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM public.current_user_organization LIMIT 1
    )
  );

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (
    id = auth.uid()
    AND organization_id = (
      SELECT organization_id FROM public.current_user_organization LIMIT 1
    )
  );

-- Channels
DROP POLICY IF EXISTS "Users view channels" ON public.channels;
DROP POLICY IF EXISTS "Users insert channels" ON public.channels;

CREATE POLICY "Users view org channels" ON public.channels
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM public.current_user_organization LIMIT 1
    )
  );

CREATE POLICY "Users insert org channels" ON public.channels
  FOR INSERT WITH CHECK (
    organization_id = (
      SELECT organization_id FROM public.current_user_organization LIMIT 1
    )
  );

-- Chat messages
DROP POLICY IF EXISTS "Users view messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users insert messages" ON public.chat_messages;

CREATE POLICY "Users view org messages" ON public.chat_messages
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM public.current_user_organization LIMIT 1
    )
  );

CREATE POLICY "Users insert org messages" ON public.chat_messages
  FOR INSERT WITH CHECK (
    organization_id = (
      SELECT organization_id FROM public.current_user_organization LIMIT 1
    )
  );

-- Tasks
DROP POLICY IF EXISTS "Users view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users insert tasks" ON public.tasks;

CREATE POLICY "Users view org tasks" ON public.tasks
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM public.current_user_organization LIMIT 1
    )
  );

CREATE POLICY "Users insert org tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    organization_id = (
      SELECT organization_id FROM public.current_user_organization LIMIT 1
    )
  );

-- Meetings
DROP POLICY IF EXISTS "Users view meetings" ON public.meetings;
DROP POLICY IF EXISTS "Users insert meetings" ON public.meetings;

CREATE POLICY "Users view org meetings" ON public.meetings
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM public.current_user_organization LIMIT 1
    )
  );

CREATE POLICY "Users insert org meetings" ON public.meetings
  FOR INSERT WITH CHECK (
    organization_id = (
      SELECT organization_id FROM public.current_user_organization LIMIT 1
    )
  );

-- Meeting attendees
DROP POLICY IF EXISTS "Users view meeting attendees" ON public.meeting_attendees;

CREATE POLICY "Users view org meeting attendees" ON public.meeting_attendees
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM public.current_user_organization LIMIT 1
    )
  );

-- Channel members
DROP POLICY IF EXISTS "Users view channel members" ON public.channel_members;

CREATE POLICY "Users view org channel members" ON public.channel_members
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM public.current_user_organization LIMIT 1
    )
  );

-- Channel access control
DROP POLICY IF EXISTS "Users view channel access control" ON public.channel_access_control;

CREATE POLICY "Users view org channel access" ON public.channel_access_control
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM public.current_user_organization LIMIT 1
    )
  );

-- Read receipts
DROP POLICY IF EXISTS "Users view message reads" ON public.chat_message_reads;

CREATE POLICY "Users view org message reads" ON public.chat_message_reads
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM public.current_user_organization LIMIT 1
    )
  );

-- Reactions
DROP POLICY IF EXISTS "Users view message reactions" ON public.message_reactions;

CREATE POLICY "Users view org reactions" ON public.message_reactions
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM public.current_user_organization LIMIT 1
    )
  );

-- Bookmarks
DROP POLICY IF EXISTS "Users view message bookmarks" ON public.message_bookmarks;

CREATE POLICY "Users view org bookmarks" ON public.message_bookmarks
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM public.current_user_organization LIMIT 1
    )
  );

-- Safety: ensure UPDATE timestamps propagate
CREATE OR REPLACE FUNCTION public.set_organization_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizations_updated_at_trigger ON public.organizations;
CREATE TRIGGER organizations_updated_at_trigger
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.set_organization_updated_at();

