-- database/migrations_multitenant_triggers.sql
-- Ensures organization_id is automatically populated for all tables that have it

CREATE OR REPLACE FUNCTION public.get_current_organization_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT organization_id INTO org_id
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.get_current_organization_id();
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl record;
  trigger_name text;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'organization_id'
  LOOP
    trigger_name := format('%s_set_org_id', tbl.table_name);

    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I;', trigger_name, tbl.table_name);
    EXECUTE format(
      'CREATE TRIGGER %I
        BEFORE INSERT ON public.%I
        FOR EACH ROW
        EXECUTE FUNCTION public.set_organization_id();',
      trigger_name,
      tbl.table_name
    );
  END LOOP;
END $$;

