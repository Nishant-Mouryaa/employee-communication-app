// supabase/functions/process-scheduled-announcements/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Process scheduled announcements
    const { error: scheduleError } = await supabaseClient.rpc(
      'process_scheduled_announcements'
    )

    if (scheduleError) throw scheduleError

    // Get newly published announcements
    const { data: published } = await supabaseClient
      .from('announcements')
      .select('id, title')
      .eq('status', 'published')
      .gte('scheduled_at', new Date(Date.now() - 60000).toISOString())

    // Send notifications for newly published announcements
    if (published) {
      for (const announcement of published) {
        // Queue notifications
        const { data: users } = await supabaseClient
          .from('notification_settings')
          .select('user_id')
          .eq('new_announcements', true)
          .eq('push_enabled', true)

        if (users) {
          const notifications = users.map(u => ({
            user_id: u.user_id,
            announcement_id: announcement.id,
            type: 'new_announcement',
            title: 'New Announcement',
            body: announcement.title,
            data: { announcementId: announcement.id }
          }))

          await supabaseClient
            .from('notification_queue')
            .insert(notifications)
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: published?.length || 0 }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})