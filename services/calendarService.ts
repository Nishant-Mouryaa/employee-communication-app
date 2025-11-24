// services/calendarService.ts
import { supabase } from '../lib/supabase'
import { Message } from '../types/chat'
import * as Linking from 'expo-linking'
import { Platform } from 'react-native'

export interface MeetingInvite {
  title: string
  description?: string
  start_time: string
  end_time: string
  attendees?: string[] // User IDs
  location?: string
  channel_id?: string
  message_id?: string
  reminder_minutes?: number[]
}

/**
 * Create a calendar event from a message
 */
export const createMeetingFromMessage = async (
  message: Message,
  userId: string,
  organizationId: string,
  inviteData: MeetingInvite
): Promise<any> => {
  try {
    // Store meeting in database
    const meeting = {
      title: inviteData.title,
      description: inviteData.description || `Meeting created from message in chat`,
      start_time: inviteData.start_time,
      end_time: inviteData.end_time,
      created_by: userId,
      location: inviteData.location || null,
      channel_id: inviteData.channel_id || message.channel_id,
      message_id: inviteData.message_id || message.id,
      reminder_minutes: inviteData.reminder_minutes || [15, 60],
      organization_id: organizationId,
    }

    console.log('Creating meeting...');
    const { data: meetingData, error: meetingError } = await supabase
      .from('meetings')
      .insert([meeting])
      .select()
      .single()

    if (meetingError) {
      console.error('Meeting creation error:', meetingError);
      throw meetingError;
    }

    console.log('Meeting created, adding attendees...');
    
    // Add attendees - include the creator automatically
    const allAttendees = [...new Set([userId, ...(inviteData.attendees || [])])]
    
    if (allAttendees.length > 0) {
      const attendees = allAttendees.map(attendeeId => ({
        meeting_id: meetingData.id,
        user_id: attendeeId,
        status: attendeeId === userId ? 'accepted' as const : 'pending' as const,
        organization_id: organizationId,
      }))

      const { error: attendeesError } = await supabase
        .from('meeting_attendees')
        .insert(attendees)

      if (attendeesError) {
        console.error('Attendee insertion error:', attendeesError);
        // Continue without throwing - meeting was created successfully
      }
    }

    // Generate calendar link
    const calendarLink = generateCalendarLink(inviteData)

    return {
      ...meetingData,
      calendar_link: calendarLink,
    }
  } catch (error) {
    console.error('Error creating meeting:', error)
    throw error
  }
}

/**
 * Generate calendar link (Google Calendar, Outlook, etc.)
 */
export const generateCalendarLink = (invite: MeetingInvite): string => {
  const startDate = new Date(invite.start_time)
  const endDate = new Date(invite.end_time)

  // Format dates for calendar (YYYYMMDDTHHMMSSZ)
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const start = formatDate(startDate)
  const end = formatDate(endDate)

  // Google Calendar URL
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: invite.title,
    dates: `${start}/${end}`,
    details: invite.description || '',
    location: invite.location || '',
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Open calendar app with event
 */
export const openCalendarApp = async (invite: MeetingInvite): Promise<void> => {
  try {
    const calendarLink = generateCalendarLink(invite)
    
    if (Platform.OS === 'ios') {
      // iOS Calendar
      const iosLink = calendarLink.replace('calendar.google.com', 'calendar.google.com')
      await Linking.openURL(iosLink)
    } else if (Platform.OS === 'android') {
      // Android Calendar
      await Linking.openURL(calendarLink)
    } else {
      // Web - open in new tab
      await Linking.openURL(calendarLink)
    }
  } catch (error) {
    console.error('Error opening calendar app:', error)
    throw error
  }
}

/**
 * Send meeting reminder
 */
export const sendMeetingReminder = async (
  meetingId: string,
  reminderMinutes: number
): Promise<void> => {
  try {
    // This would typically integrate with a notification service
    // For now, we'll just log it
    console.log(`Reminder for meeting ${meetingId} in ${reminderMinutes} minutes`)
    
    // In a real implementation, you'd:
    // 1. Schedule a push notification
    // 2. Send an email reminder
    // 3. Update the meeting record
  } catch (error) {
    console.error('Error sending meeting reminder:', error)
    throw error
  }
}

/**
 * Get meetings for a user
 */
export const getUserMeetings = async (userId: string, organizationId: string): Promise<any[]> => {
  try {
    // Fixed query - use the correct relationship name
    const { data, error } = await supabase
      .from('meetings')
      .select(`
        *,
        meeting_attendees (
          user_id,
          status
        )
      `)
      .or(`created_by.eq.${userId},meeting_attendees.user_id.eq.${userId}`)
      .eq('meetings.organization_id', organizationId)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching user meetings:', error)
    return []
  }
}

/**
 * Update meeting attendance status
 */
export const updateAttendanceStatus = async (
  meetingId: string,
  userId: string,
  organizationId: string,
  status: 'accepted' | 'declined' | 'tentative'
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('meeting_attendees')
      .update({
        status,
        responded_at: new Date().toISOString()
      })
      .eq('meeting_id', meetingId)
      .eq('user_id', userId)
      .eq('organization_id', organizationId)

    if (error) throw error
  } catch (error) {
    console.error('Error updating attendance status:', error)
    throw error
  }
}