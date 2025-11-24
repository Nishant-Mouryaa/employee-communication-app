-- database/migrations_fix_channel_unique.sql
-- Fix channel name unique constraint to be per-organization instead of global

-- Drop the existing unique constraint on name (if it exists)
DO $$
BEGIN
  -- Check if the constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'channels_name_key' 
    AND conrelid = 'public.channels'::regclass
  ) THEN
    ALTER TABLE public.channels DROP CONSTRAINT channels_name_key;
  END IF;
END $$;

-- Create a unique constraint on (name, organization_id) instead
-- This allows the same channel name in different organizations
CREATE UNIQUE INDEX IF NOT EXISTS channels_name_org_unique 
ON public.channels (name, organization_id);

