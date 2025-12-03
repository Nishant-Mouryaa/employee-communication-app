// supabase/functions/send-invitation-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface InvitationEmailRequest {
  to: string
  inviteLink: string
  role: string
  organizationId: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { to, inviteLink, role, organizationId }: InvitationEmailRequest = await req.json()

    // Validate input
    if (!to || !inviteLink || !role) {
      throw new Error('Missing required fields')
    }

    // Get organization details (optional - for personalizing email)
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    const organizationName = org?.name || 'the team'

    // Send email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Team Invite <onboarding@resend.dev>', // Use resend.dev for testing, change to your domain later
        to: [to],
        subject: `You've been invited to join ${organizationName}!`,
        html: getEmailTemplate(inviteLink, role, organizationName),
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Resend error:', data)
      throw new Error(data.message || 'Failed to send email')
    }

    console.log('✅ Email sent successfully:', data)

    return new Response(
      JSON.stringify({ success: true, emailId: data.id }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error: any) {
    console.error('❌ Error sending invitation email:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})

function getEmailTemplate(inviteLink: string, role: string, organizationName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Team Invitation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center;">
                  <h1 style="margin: 0; color: #1e293b; font-size: 28px; font-weight: 700;">
                    🎉 You've Been Invited!
                  </h1>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td style="padding: 0 40px 40px;">
                  <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                    You've been invited to join <strong style="color: #1e293b;">${organizationName}</strong> as a <strong style="color: #6366F1;">${role}</strong>.
                  </p>
                  
                  <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                    Click the button below to accept your invitation and get started:
                  </p>
                  
                  <!-- Button -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <a href="${inviteLink}" 
                           style="display: inline-block; background-color: #6366F1; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                          Accept Invitation
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Alternative link -->
                  <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
                    Or copy and paste this link in your browser:
                  </p>
                  <p style="color: #6366F1; font-size: 14px; word-break: break-all; background-color: #f1f5f9; padding: 12px; border-radius: 6px; margin: 8px 0 0;">
                    ${inviteLink}
                  </p>
                 
                  <!-- Expiry notice -->
                  <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 30px 0 0; text-align: center;">
                    ⏰ This invitation expires in 7 days
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 20px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                  <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                    If you didn't expect this invitation, you can safely ignore this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}