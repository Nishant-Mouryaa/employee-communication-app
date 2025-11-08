// services/homeDataService.ts
import { supabase } from '../lib/supabase'
import { Activity } from '../types/home'
import { formatTimeAgo } from '../utils/timeFormat'

export const fetchUnreadMessagesCount = async (userId: string): Promise<number> => {
  try {
    const { data: memberChannels, error: memberError } = await supabase
      .from('channel_members')
      .select('channel_id')
      .eq('user_id', userId)

    if (memberError || !memberChannels || memberChannels.length === 0) {
      return 0
    }

    const channelIds = memberChannels.map(member => member.channel_id)

    const { data: readMessages, error: readError } = await supabase
      .from('chat_message_reads')
      .select('message_id')
      .eq('user_id', userId)

    if (readError) {
      console.error('Error fetching read messages:', readError)
      return 0
    }

    const readMessageIds = new Set(readMessages?.map(msg => msg.message_id) || [])

    const { data: channelMessages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('id')
      .in('channel_id', channelIds)
      .neq('user_id', userId)

    if (messagesError) {
      console.error('Error fetching channel messages:', messagesError)
      return 0
    }

    const unreadCount = channelMessages?.filter(msg => 
      !readMessageIds.has(msg.id)
    ).length || 0

    return unreadCount
  } catch (error) {
    console.error('Error fetching unread messages:', error)
    return 0
  }
}

export const fetchPendingTasksCount = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .in('status', ['todo', 'in-progress'])

    if (error) throw error

    return count || 0
  } catch (error) {
    console.error('Error fetching pending tasks:', error)
    return 0
  }
}

export const fetchRecentActivities = async (userId: string): Promise<Activity[]> => {
  try {
    const { data: userChannels } = await supabase
      .from('channel_members')
      .select('channel_id')
      .eq('user_id', userId)

    const channelIds = userChannels?.map(uc => uc.channel_id) || []
    const activities: Activity[] = []

    // Get recent messages
    if (channelIds.length > 0) {
      const messagesActivities = await fetchMessageActivities(channelIds)
      activities.push(...messagesActivities)
    }

    // Get recent tasks
    const taskActivities = await fetchTaskActivities(userId)
    activities.push(...taskActivities)

    // Get recent announcements
    const announcementActivities = await fetchAnnouncementActivities()
    activities.push(...announcementActivities)

    return activities
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 8)
      .map(activity => ({
        ...activity,
        time: formatTimeAgo(activity.time)
      }))
  } catch (error) {
    console.error('Error fetching recent activities:', error)
    return []
  }
}

const fetchMessageActivities = async (channelIds: string[]): Promise<Activity[]> => {
  const { data: recentMessages } = await supabase
    .from('chat_messages')
    .select('id, content, created_at, user_id, channel_id')
    .in('channel_id', channelIds)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!recentMessages) return []

  const { data: channels } = await supabase
    .from('channels')
    .select('id, name')
    .in('id', channelIds)

  const channelMap = new Map(channels?.map(ch => [ch.id, ch.name]) || [])

  const userIds = [...new Set(recentMessages.map(msg => msg.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, full_name')
    .in('id', userIds)

  const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

  return recentMessages.map(msg => {
    const profile = profileMap.get(msg.user_id)
    const channelName = channelMap.get(msg.channel_id)
    const userName = profile?.full_name || profile?.username || 'Someone'
    
    return {
      id: `msg_${msg.id}`,
      text: `${userName} sent a message in #${channelName || 'general'}`,
      time: msg.created_at,
      type: 'message' as const
    }
  })
}

const fetchTaskActivities = async (userId: string): Promise<Activity[]> => {
  const { data: recentTasks } = await supabase
    .from('tasks')
    .select('id, title, created_at, status')
    .eq('assigned_to', userId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (!recentTasks) return []

  return recentTasks.map(task => ({
    id: `task_${task.id}`,
    text: `Task "${task.title}" ${task.status === 'todo' ? 'assigned to you' : 'was updated'}`,
    time: task.created_at,
    type: 'task' as const
  }))
}

const fetchAnnouncementActivities = async (): Promise<Activity[]> => {
  const { data: recentAnnouncements } = await supabase
    .from('announcements')
    .select('id, title, created_at, author_id')
    .order('created_at', { ascending: false })
    .limit(5)

  if (!recentAnnouncements) return []

  const authorIds = [...new Set(recentAnnouncements.map(a => a.author_id))]
  const { data: authors } = await supabase
    .from('profiles')
    .select('id, username, full_name')
    .in('id', authorIds)

  const authorMap = new Map(authors?.map(a => [a.id, a]) || [])

  return recentAnnouncements.map(announcement => {
    const author = authorMap.get(announcement.author_id)
    const authorName = author?.full_name || author?.username || 'Someone'
    
    return {
      id: `ann_${announcement.id}`,
      text: `${authorName} posted: ${announcement.title}`,
      time: announcement.created_at,
      type: 'announcement' as const
    }
  })
}