// screens/HomeScreen.tsx
import React, { useState, useEffect, useRef } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  RefreshControl,
  SafeAreaView,
  Dimensions,
  Animated
} from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigation } from '@react-navigation/native'
import type { RealtimeChannel } from '@supabase/supabase-js'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const IS_MOBILE = SCREEN_WIDTH < 768

interface Stats {
  unreadMessages: number
  pendingTasks: number
  recentActivities: Array<{
    id: string
    text: string
    time: string
    type: string
  }>
}

export default function HomeScreen() {
  const { user } = useAuth()
  const navigation = useNavigation()
  const [stats, setStats] = useState<Stats>({
    unreadMessages: 0,
    pendingTasks: 0,
    recentActivities: []
  })
  const [loading, setLoading] = useState(true)
  const subscriptionsRef = useRef<RealtimeChannel[]>([])
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (user) {
      fetchHomeData()
      setupRealtimeSubscriptions()
      
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start()
    }

    return () => {
      // Cleanup subscriptions
      subscriptionsRef.current.forEach(sub => {
        supabase.removeChannel(sub)
      })
    }
  }, [user])

  const fetchHomeData = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      const [unreadMessages, pendingTasks, recentActivities] = await Promise.all([
        fetchUnreadMessagesCount(),
        fetchPendingTasksCount(),
        fetchRecentActivities()
      ])

      setStats({
        unreadMessages,
        pendingTasks,
        recentActivities
      })
    } catch (error) {
      console.error('Error fetching home data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUnreadMessagesCount = async (): Promise<number> => {
    if (!user) return 0

    try {
      // Get channels user is member of
      const { data: memberChannels, error: memberError } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', user.id)

      if (memberError || !memberChannels || memberChannels.length === 0) {
        return 0
      }

      const channelIds = memberChannels.map(member => member.channel_id)

      // Get read message IDs for this user
      const { data: readMessages, error: readError } = await supabase
        .from('chat_message_reads')
        .select('message_id')
        .eq('user_id', user.id)

      if (readError) {
        console.error('Error fetching read messages:', readError)
        return 0
      }

      const readMessageIds = new Set(readMessages?.map(msg => msg.message_id) || [])

      // Get all messages from user's channels (excluding own messages)
      const { data: channelMessages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('id')
        .in('channel_id', channelIds)
        .neq('user_id', user.id)

      if (messagesError) {
        console.error('Error fetching channel messages:', messagesError)
        return 0
      }

      // Count unread messages
      const unreadCount = channelMessages?.filter(msg => 
        !readMessageIds.has(msg.id)
      ).length || 0

      return unreadCount
    } catch (error) {
      console.error('Error fetching unread messages:', error)
      return 0
    }
  }

  const fetchPendingTasksCount = async (): Promise<number> => {
    if (!user) return 0

    try {
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .in('status', ['todo', 'in-progress'])

      if (error) throw error

      return count || 0
    } catch (error) {
      console.error('Error fetching pending tasks:', error)
      return 0
    }
  }

  const fetchRecentActivities = async () => {
    if (!user) return []

    try {
      // Get user's channels
      const { data: userChannels } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', user.id)

      const channelIds = userChannels?.map(uc => uc.channel_id) || []

      const activities = []

      // Get recent messages
      if (channelIds.length > 0) {
        const { data: recentMessages } = await supabase
          .from('chat_messages')
          .select(`
            id,
            content,
            created_at,
            user_id,
            channel_id
          `)
          .in('channel_id', channelIds)
          .order('created_at', { ascending: false })
          .limit(10)

        if (recentMessages) {
          // Get channel names
          const { data: channels } = await supabase
            .from('channels')
            .select('id, name')
            .in('id', channelIds)

          const channelMap = new Map(channels?.map(ch => [ch.id, ch.name]) || [])

          // Get user profiles
          const userIds = [...new Set(recentMessages.map(msg => msg.user_id))]
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, full_name')
            .in('id', userIds)

          const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

          recentMessages.forEach(msg => {
            const profile = profileMap.get(msg.user_id)
            const channelName = channelMap.get(msg.channel_id)
            const userName = profile?.full_name || profile?.username || 'Someone'
            
            activities.push({
              id: `msg_${msg.id}`,
              text: `${userName} sent a message in #${channelName || 'general'}`,
              time: msg.created_at,
              type: 'message'
            })
          })
        }
      }

      // Get recent tasks
      const { data: recentTasks } = await supabase
        .from('tasks')
        .select('id, title, created_at, status')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentTasks) {
        recentTasks.forEach(task => {
          activities.push({
            id: `task_${task.id}`,
            text: `Task "${task.title}" ${task.status === 'todo' ? 'assigned to you' : 'was updated'}`,
            time: task.created_at,
            type: 'task'
          })
        })
      }

      // Get recent announcements
      const { data: recentAnnouncements } = await supabase
        .from('announcements')
        .select(`
          id, 
          title, 
          created_at,
          author_id
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentAnnouncements) {
        // Get author profiles
        const authorIds = [...new Set(recentAnnouncements.map(a => a.author_id))]
        const { data: authors } = await supabase
          .from('profiles')
          .select('id, username, full_name')
          .in('id', authorIds)

        const authorMap = new Map(authors?.map(a => [a.id, a]) || [])

        recentAnnouncements.forEach(announcement => {
          const author = authorMap.get(announcement.author_id)
          const authorName = author?.full_name || author?.username || 'Someone'
          
          activities.push({
            id: `ann_${announcement.id}`,
            text: `${authorName} posted: ${announcement.title}`,
            time: announcement.created_at,
            type: 'announcement'
          })
        })
      }

      // Sort by time and take latest 8
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

  const setupRealtimeSubscriptions = () => {
    if (!user) return

    // Subscribe to new messages
    const messagesSubscription = supabase
      .channel(`home-messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        () => {
          fetchUnreadMessagesCount().then(count => {
            setStats(prev => ({ ...prev, unreadMessages: count }))
          })
          fetchRecentActivities().then(activities => {
            setStats(prev => ({ ...prev, recentActivities: activities }))
          })
        }
      )
      .subscribe()

    // Subscribe to message reads
    const readsSubscription = supabase
      .channel(`home-reads-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_message_reads',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchUnreadMessagesCount().then(count => {
            setStats(prev => ({ ...prev, unreadMessages: count }))
          })
        }
      )
      .subscribe()

    // Subscribe to task changes
    const tasksSubscription = supabase
      .channel(`home-tasks-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `assigned_to=eq.${user.id}`
        },
        () => {
          fetchPendingTasksCount().then(count => {
            setStats(prev => ({ ...prev, pendingTasks: count }))
          })
          fetchRecentActivities().then(activities => {
            setStats(prev => ({ ...prev, recentActivities: activities }))
          })
        }
      )
      .subscribe()

    // Subscribe to announcements
    const announcementsSubscription = supabase
      .channel(`home-announcements-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements'
        },
        () => {
          fetchRecentActivities().then(activities => {
            setStats(prev => ({ ...prev, recentActivities: activities }))
          })
        }
      )
      .subscribe()

    subscriptionsRef.current = [
      messagesSubscription,
      readsSubscription,
      tasksSubscription,
      announcementsSubscription
    ]
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return time.toLocaleDateString()
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'message': return '💬'
      case 'task': return '✓'
      case 'announcement': return '📢'
      default: return '•'
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'message': return '#6366f1'
      case 'task': return '#f59e0b'
      case 'announcement': return '#10b981'
      default: return '#6366f1'
    }
  }

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'createTask':
        navigation.navigate('Tasks' as never)
        break
      case 'postAnnouncement':
        navigation.navigate('Announcements' as never)
        break
      case 'startChat':
        navigation.navigate('Chat' as never)
        break
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Smart Workplace</Text>
            <Text style={styles.subtitle}>
              {user ? `Welcome, ${user.email?.split('@')[0]}!` : 'Welcome!'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={() => {
              Alert.alert(
                'Sign Out',
                'Are you sure you want to sign out?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Sign Out', 
                    style: 'destructive',
                    onPress: () => supabase.auth.signOut()
                  }
                ]
              )
            }}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchHomeData}
            tintColor="#6366f1"
          />
        }
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <TouchableOpacity 
              style={[styles.statCard, styles.messagesCard]}
              onPress={() => navigation.navigate('Chat' as never)}
              activeOpacity={0.7}
            >
              <View style={styles.statHeader}>
                <View style={[styles.statIconContainer, { backgroundColor: '#eef2ff' }]}>
                  <Text style={styles.statIcon}>💬</Text>
                </View>
                {stats.unreadMessages > 0 && (
                  <View style={styles.statBadge}>
                    <Text style={styles.statBadgeText}>
                      {stats.unreadMessages > 99 ? '99+' : stats.unreadMessages}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.statNumber}>{stats.unreadMessages}</Text>
              <Text style={styles.statLabel}>Unread Messages</Text>
              <Text style={styles.statAction}>View chats →</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.statCard, styles.tasksCard]}
              onPress={() => navigation.navigate('Tasks' as never)}
              activeOpacity={0.7}
            >
              <View style={styles.statHeader}>
                <View style={[styles.statIconContainer, { backgroundColor: '#fef3c7' }]}>
                  <Text style={styles.statIcon}>✓</Text>
                </View>
                {stats.pendingTasks > 0 && (
                  <View style={[styles.statBadge, { backgroundColor: '#f59e0b' }]}>
                    <Text style={styles.statBadgeText}>
                      {stats.pendingTasks > 99 ? '99+' : stats.pendingTasks}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.statNumber}>{stats.pendingTasks}</Text>
              <Text style={styles.statLabel}>Pending Tasks</Text>
              <Text style={styles.statAction}>View tasks →</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => handleQuickAction('startChat')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBg, { backgroundColor: '#eef2ff' }]}>
                  <Text style={styles.actionIcon}>💬</Text>
                </View>
                <Text style={styles.actionTitle}>Start Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => handleQuickAction('createTask')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBg, { backgroundColor: '#fef3c7' }]}>
                  <Text style={styles.actionIcon}>📝</Text>
                </View>
                <Text style={styles.actionTitle}>New Task</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => handleQuickAction('postAnnouncement')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBg, { backgroundColor: '#d1fae5' }]}>
                  <Text style={styles.actionIcon}>📢</Text>
                </View>
                <Text style={styles.actionTitle}>Announce</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => navigation.navigate('Calendar' as never)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBg, { backgroundColor: '#fce7f3' }]}>
                  <Text style={styles.actionIcon}>📅</Text>
                </View>
                <Text style={styles.actionTitle}>Calendar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.activityContainer}>
              {stats.recentActivities.length > 0 ? (
                stats.recentActivities.map((activity, index) => (
                  <View 
                    key={activity.id} 
                    style={[
                      styles.activityItem,
                      index === stats.recentActivities.length - 1 && styles.lastActivityItem
                    ]}
                  >
                    <View 
                      style={[
                        styles.activityIconContainer,
                        { backgroundColor: `${getActivityColor(activity.type)}15` }
                      ]}
                    >
                      <Text style={styles.activityIcon}>
                        {getActivityIcon(activity.type)}
                      </Text>
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityText} numberOfLines={2}>
                        {activity.text}
                      </Text>
                      <Text style={styles.activityTime}>{activity.time}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🌟</Text>
                  <Text style={styles.emptyTitle}>No Recent Activity</Text>
                  <Text style={styles.emptyText}>
                    Your recent messages, tasks, and announcements will appear here
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingTop: IS_MOBILE ? 16 : 20,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: IS_MOBILE ? 24 : 32,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: IS_MOBILE ? 14 : 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '400',
  },
  signOutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signOutText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  messagesCard: {
    borderTopWidth: 3,
    borderTopColor: '#6366f1',
  },
  tasksCard: {
    borderTopWidth: 3,
    borderTopColor: '#f59e0b',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: {
    fontSize: 24,
  },
  statBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  statAction: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: IS_MOBILE ? 0 : 1,
    minWidth: IS_MOBILE ? (SCREEN_WIDTH - 52) / 2 : undefined,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    fontSize: 28,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  activityContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  lastActivityItem: {
    borderBottomWidth: 0,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityIcon: {
    fontSize: 18,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '500',
    marginBottom: 4,
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 13,
    color: '#9ca3af',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
})