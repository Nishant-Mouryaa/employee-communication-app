-- database/migrations_org_setup.sql
-- Allow organization_id to be nullable in profiles table
-- This enables users to sign up first, then create/join an organization

-- Make organization_id nullable in profiles
ALTER TABLE public.profiles
  ALTER COLUMN organization_id DROP NOT NULL;

-- Update RLS policies to allow users without organization_id
-- Users can view their own profile even without organization_id
DROP POLICY IF EXISTS "Profiles are viewable by users in the same organization" ON public.profiles;
CREATE POLICY "Profiles are viewable by users in the same organization" ON public.profiles
FOR SELECT TO authenticated 
USING (
  organization_id = public.get_current_org_id() 
  OR (organization_id IS NULL AND auth.uid() = id)
);

-- Users can update their own profile even without organization_id
DROP POLICY IF EXISTS "Users can update their own profile within their organization" ON public.profiles;
CREATE POLICY "Users can update their own profile within their organization" ON public.profiles
FOR UPDATE TO authenticated 
USING (
  (auth.uid() = id AND organization_id = public.get_current_org_id())
  OR (auth.uid() = id AND organization_id IS NULL)
);

-- Users can create profiles without organization_id
DROP POLICY IF EXISTS "Users can create profiles for their organization" ON public.profiles;
CREATE POLICY "Users can create profiles for their organization" ON public.profiles
FOR INSERT TO authenticated 
WITH CHECK (
  organization_id = public.get_current_org_id() 
  OR organization_id IS NULL
);

