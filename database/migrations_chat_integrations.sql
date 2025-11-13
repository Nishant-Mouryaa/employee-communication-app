-- database/migrations_chat_integrations.sql
-- Migration for task conversion, calendar integration, and link previews

-- Add source_message_id and source_channel_id to tasks table for message-to-task conversion
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS source_message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL;

-- Create index for task conversion lookups
CREATE INDEX IF NOT EXISTS tasks_source_message_idx ON public.tasks(source_message_id)
WHERE source_message_id IS NOT NULL;

-- Create meetings table for calendar integration
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  reminder_minutes INTEGER[] DEFAULT ARRAY[15, 60],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for meetings
CREATE INDEX IF NOT EXISTS meetings_start_time_idx ON public.meetings(start_time);
CREATE INDEX IF NOT EXISTS meetings_created_by_idx ON public.meetings(created_by);
CREATE INDEX IF NOT EXISTS meetings_channel_idx ON public.meetings(channel_id)
WHERE channel_id IS NOT NULL;

-- Create meeting_attendees table
CREATE TABLE IF NOT EXISTS public.meeting_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'tentative')),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(meeting_id, user_id)
);

-- Create indexes for meeting_attendees
CREATE INDEX IF NOT EXISTS meeting_attendees_meeting_idx ON public.meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS meeting_attendees_user_idx ON public.meeting_attendees(user_id);

-- Enable Row Level Security (RLS) for meetings
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meetings
-- Users can view meetings they created or are invited to
CREATE POLICY "Users can view own meetings" ON public.meetings
FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR id IN (
    SELECT meeting_id FROM public.meeting_attendees WHERE user_id = auth.uid()
  )
);

-- Users can create meetings
CREATE POLICY "Users can create meetings" ON public.meetings
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- Users can update meetings they created
CREATE POLICY "Users can update own meetings" ON public.meetings
FOR UPDATE TO authenticated
USING (created_by = auth.uid());

-- Users can delete meetings they created
CREATE POLICY "Users can delete own meetings" ON public.meetings
FOR DELETE TO authenticated
USING (created_by = auth.uid());

-- RLS Policies for meeting_attendees
-- Users can view attendees for meetings they can see
CREATE POLICY "Users can view meeting attendees" ON public.meeting_attendees
FOR SELECT TO authenticated
USING (
  meeting_id IN (
    SELECT id FROM public.meetings
    WHERE created_by = auth.uid()
    OR id IN (
      SELECT meeting_id FROM public.meeting_attendees WHERE user_id = auth.uid()
    )
  )
);

-- Meeting creators can add attendees
CREATE POLICY "Meeting creators can add attendees" ON public.meeting_attendees
FOR INSERT TO authenticated
WITH CHECK (
  meeting_id IN (
    SELECT id FROM public.meetings WHERE created_by = auth.uid()
  )
);

-- Users can update their own attendance status
CREATE POLICY "Users can update own attendance" ON public.meeting_attendees
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Create link_previews table for caching link metadata (optional optimization)
CREATE TABLE IF NOT EXISTS public.link_previews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  image_url TEXT,
  site_name TEXT,
  favicon_url TEXT,
  preview_type TEXT,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Create index for link_previews
CREATE INDEX IF NOT EXISTS link_previews_url_idx ON public.link_previews(url);
CREATE INDEX IF NOT EXISTS link_previews_expires_idx ON public.link_previews(expires_at);

-- Function to clean up expired link previews (optional)
CREATE OR REPLACE FUNCTION cleanup_expired_link_previews()
RETURNS void AS $$
BEGIN
  DELETE FROM public.link_previews
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

