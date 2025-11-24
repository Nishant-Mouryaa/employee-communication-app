-- database/migrations_multitenant_content.sql
-- Extends multi-tenant coverage to task/announcement/admin tables

-- Helper to reuse default org logic
CREATE OR REPLACE FUNCTION public.get_default_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id
  FROM public.organizations
  ORDER BY created_at
  LIMIT 1
$$;

-------------------------------------------------------------------------------
-- Task-related tables
-------------------------------------------------------------------------------

ALTER TABLE public.task_labels
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.task_labels
SET organization_id = COALESCE(organization_id, public.get_default_organization_id());

ALTER TABLE public.task_labels
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS task_labels_org_idx
  ON public.task_labels (organization_id);

ALTER TABLE public.task_label_assignments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.task_label_assignments tla
SET organization_id = COALESCE(
  tla.organization_id,
  t.organization_id,
  public.get_default_organization_id()
)
FROM public.tasks t
WHERE tla.task_id = t.id;

ALTER TABLE public.task_label_assignments
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS task_label_assignments_org_idx
  ON public.task_label_assignments (organization_id);

ALTER TABLE public.task_attachments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.task_attachments ta
SET organization_id = COALESCE(
  ta.organization_id,
  t.organization_id,
  public.get_default_organization_id()
)
FROM public.tasks t
WHERE ta.task_id = t.id;

ALTER TABLE public.task_attachments
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS task_attachments_org_idx
  ON public.task_attachments (organization_id);

ALTER TABLE public.task_comments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.task_comments tc
SET organization_id = COALESCE(
  tc.organization_id,
  t.organization_id,
  public.get_default_organization_id()
)
FROM public.tasks t
WHERE tc.task_id = t.id;

ALTER TABLE public.task_comments
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS task_comments_org_idx
  ON public.task_comments (organization_id);

-------------------------------------------------------------------------------
-- Announcement-related tables
-------------------------------------------------------------------------------

ALTER TABLE public.announcement_categories
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.announcement_categories
SET organization_id = COALESCE(organization_id, public.get_default_organization_id());

ALTER TABLE public.announcement_categories
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS announcement_categories_org_idx
  ON public.announcement_categories (organization_id);

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.announcements a
SET organization_id = COALESCE(
  a.organization_id,
  p.organization_id,
  public.get_default_organization_id()
)
FROM public.profiles p
WHERE a.author_id = p.id;

ALTER TABLE public.announcements
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS announcements_org_idx
  ON public.announcements (organization_id);

ALTER TABLE public.announcement_reads
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.announcement_reads ar
SET organization_id = COALESCE(
  ar.organization_id,
  a.organization_id,
  public.get_default_organization_id()
)
FROM public.announcements a
WHERE ar.announcement_id = a.id;

ALTER TABLE public.announcement_reads
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS announcement_reads_org_idx
  ON public.announcement_reads (organization_id);

ALTER TABLE public.announcement_reactions
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.announcement_reactions ar
SET organization_id = COALESCE(
  ar.organization_id,
  a.organization_id,
  public.get_default_organization_id()
)
FROM public.announcements a
WHERE ar.announcement_id = a.id;

ALTER TABLE public.announcement_reactions
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS announcement_reactions_org_idx
  ON public.announcement_reactions (organization_id);

ALTER TABLE public.announcement_attachments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.announcement_attachments aa
SET organization_id = COALESCE(
  aa.organization_id,
  a.organization_id,
  public.get_default_organization_id()
)
FROM public.announcements a
WHERE aa.announcement_id = a.id;

ALTER TABLE public.announcement_attachments
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS announcement_attachments_org_idx
  ON public.announcement_attachments (organization_id);

ALTER TABLE public.announcement_comments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.announcement_comments ac
SET organization_id = COALESCE(
  ac.organization_id,
  a.organization_id,
  public.get_default_organization_id()
)
FROM public.announcements a
WHERE ac.announcement_id = a.id;

ALTER TABLE public.announcement_comments
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS announcement_comments_org_idx
  ON public.announcement_comments (organization_id);

ALTER TABLE public.announcement_versions
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.announcement_versions av
SET organization_id = COALESCE(
  av.organization_id,
  a.organization_id,
  public.get_default_organization_id()
)
FROM public.announcements a
WHERE av.announcement_id = a.id;

ALTER TABLE public.announcement_versions
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS announcement_versions_org_idx
  ON public.announcement_versions (organization_id);

ALTER TABLE public.announcement_analytics
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.announcement_analytics aa
SET organization_id = COALESCE(
  aa.organization_id,
  a.organization_id,
  public.get_default_organization_id()
)
FROM public.announcements a
WHERE aa.announcement_id = a.id;

ALTER TABLE public.announcement_analytics
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS announcement_analytics_org_idx
  ON public.announcement_analytics (organization_id);

ALTER TABLE public.user_activity_logs
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.user_activity_logs ual
SET organization_id = COALESCE(
  ual.organization_id,
  a.organization_id,
  p.organization_id,
  public.get_default_organization_id()
)
FROM public.announcements a
LEFT JOIN public.profiles p ON p.id = ual.user_id
WHERE ual.announcement_id = a.id;

ALTER TABLE public.user_activity_logs
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS user_activity_logs_org_idx
  ON public.user_activity_logs (organization_id);

-------------------------------------------------------------------------------
-- Admin/compliance tables
-------------------------------------------------------------------------------

ALTER TABLE public.access_policies
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.access_policies
SET organization_id = COALESCE(organization_id, public.get_default_organization_id());

ALTER TABLE public.access_policies
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS access_policies_org_idx
  ON public.access_policies (organization_id);

ALTER TABLE public.compliance_settings
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.compliance_settings
SET organization_id = COALESCE(organization_id, public.get_default_organization_id());

ALTER TABLE public.compliance_settings
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS compliance_settings_org_idx
  ON public.compliance_settings (organization_id);

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.audit_logs al
SET organization_id = COALESCE(
  al.organization_id,
  p.organization_id,
  public.get_default_organization_id()
)
FROM public.profiles p
WHERE al.user_id = p.id;

ALTER TABLE public.audit_logs
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS audit_logs_org_idx
  ON public.audit_logs (organization_id);

-- Notification settings
ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.notification_settings ns
SET organization_id = COALESCE(
  ns.organization_id,
  p.organization_id,
  public.get_default_organization_id()
)
FROM public.profiles p
WHERE ns.user_id = p.id;

ALTER TABLE public.notification_settings
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS notification_settings_org_idx
  ON public.notification_settings (organization_id);

ALTER TABLE public.push_tokens
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.push_tokens pt
SET organization_id = COALESCE(
  pt.organization_id,
  p.organization_id,
  public.get_default_organization_id()
)
FROM public.profiles p
WHERE pt.user_id = p.id;

ALTER TABLE public.push_tokens
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS push_tokens_org_idx
  ON public.push_tokens (organization_id);

ALTER TABLE public.notification_queue
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.notification_queue nq
SET organization_id = COALESCE(
  nq.organization_id,
  p.organization_id,
  public.get_default_organization_id()
)
FROM public.profiles p
WHERE nq.user_id = p.id;

ALTER TABLE public.notification_queue
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS notification_queue_org_idx
  ON public.notification_queue (organization_id);

-- Cleanup helper
DROP FUNCTION IF EXISTS public.get_default_organization_id;

