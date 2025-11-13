-- database/migrations_chat_features.sql
-- Migration for chat features: unread separator, starred messages, pinned messages, and search

-- Add columns for pinned messages
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP WITH TIME ZONE;

-- Create index for pinned messages (only if channel_id column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'chat_messages' 
    AND column_name = 'channel_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS chat_messages_pinned_idx 
    ON public.chat_messages(channel_id, is_pinned) 
    WHERE is_pinned = TRUE;
  END IF;
END $$;

-- Create message_bookmarks table for starred/saved messages
CREATE TABLE IF NOT EXISTS public.message_bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Create indexes for message_bookmarks
CREATE INDEX IF NOT EXISTS message_bookmarks_user_idx ON public.message_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS message_bookmarks_message_idx ON public.message_bookmarks(message_id);
CREATE INDEX IF NOT EXISTS message_bookmarks_created_idx ON public.message_bookmarks(created_at DESC);

-- Enable Row Level Security (RLS) for message_bookmarks
ALTER TABLE public.message_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_bookmarks
-- Users can view their own bookmarks
CREATE POLICY "Users can view own bookmarks" ON public.message_bookmarks
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users can create their own bookmarks
CREATE POLICY "Users can create own bookmarks" ON public.message_bookmarks
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own bookmarks
CREATE POLICY "Users can delete own bookmarks" ON public.message_bookmarks
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Add indexes for search functionality (if not already present)
-- These help with text search and filtering
-- Note: Only create these indexes if the columns exist
-- Check if created_at column exists before creating index
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'chat_messages' 
    AND column_name = 'created_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS chat_messages_channel_created_idx 
    ON public.chat_messages(channel_id, created_at DESC);
    
    CREATE INDEX IF NOT EXISTS chat_messages_user_created_idx 
    ON public.chat_messages(user_id, created_at DESC);
  END IF;
END $$;

-- Text search index (only if content column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'chat_messages' 
    AND column_name = 'content'
  ) THEN
    CREATE INDEX IF NOT EXISTS chat_messages_content_idx 
    ON public.chat_messages USING gin(to_tsvector('english', content));
  END IF;
END $$;

-- Index for mentions (if using array column)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'chat_messages' 
    AND column_name = 'mentions'
  ) THEN
    CREATE INDEX IF NOT EXISTS chat_messages_mentions_idx 
    ON public.chat_messages USING gin(mentions);
  END IF;
END $$;

-- Index for attachments (if using JSONB)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'chat_messages' 
    AND column_name = 'attachments'
  ) THEN
    CREATE INDEX IF NOT EXISTS chat_messages_attachments_idx 
    ON public.chat_messages USING gin(attachments);
  END IF;
END $$;

-- Note: The chat_message_reads table should already exist from previous migrations
-- If not, you may need to create it:
-- CREATE TABLE IF NOT EXISTS public.chat_message_reads (
--   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--   message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
--   user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   UNIQUE(message_id, user_id)
-- );

-- Create index for read receipts (for unread separator feature)
-- Only if the table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'chat_message_reads'
  ) THEN
    CREATE INDEX IF NOT EXISTS chat_message_reads_user_message_idx 
    ON public.chat_message_reads(user_id, message_id);
    
    -- Only create read_at index if column exists (chat_message_reads uses read_at, not created_at)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'chat_message_reads' 
      AND column_name = 'read_at'
    ) THEN
      CREATE INDEX IF NOT EXISTS chat_message_reads_message_read_at_idx 
      ON public.chat_message_reads(message_id, read_at DESC);
    END IF;
  END IF;
END $$;

