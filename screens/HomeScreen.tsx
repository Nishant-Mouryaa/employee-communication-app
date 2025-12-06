// screens/HomeScreen.tsx
import React, { useEffect, useRef, useCallback } from 'react'
import { 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  Animated,
  View
} from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { useNavigation } from '@react-navigation/native'
import { useHomeData } from '../hooks/useHomeData'
import { useRealtimeSubscriptions } from '../hooks/useRealtimeSubscriptions'
import { HomeHeader } from '../components/home/HomeHeader'
import { TodaysOverview } from '../components/home/TodaysOverview'
import { QuickActionsSection } from '../components/home/QuickActionsSection'
import { QuickAction } from '../types/home'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function HomeScreen() {
  const { user } = useAuth()
  const navigation = useNavigation<any>()
  const fadeAnim = useRef(new Animated.Value(0)).current
  
  const {
    stats,
    loading,
    fetchHomeData,
    updateUnreadCount,
    updatePendingTasks,
    updateActivities
  } = useHomeData(user?.id)

  // Handle realtime message changes
  const handleMessageChange = useCallback(() => {
    updateUnreadCount()
  }, [updateUnreadCount])

  // Handle realtime task changes
  const handleTaskChange = useCallback(() => {
    updatePendingTasks()
  }, [updatePendingTasks])

  // Handle realtime announcement changes
  const handleAnnouncementChange = useCallback(() => {
    updateActivities()
  }, [updateActivities])

  // Setup realtime subscriptions
  useRealtimeSubscriptions({
    userId: user?.id,
    onMessageChange: handleMessageChange,
    onTaskChange: handleTaskChange,
    onAnnouncementChange: handleAnnouncementChange,
  })

  // Initial data fetch and fade in animation
  useEffect(() => {
    if (user) {
      fetchHomeData()
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start()
    }
  }, [user, fetchHomeData, fadeAnim])

  // Navigation handlers
  const handleQuickAction = useCallback((action: QuickAction) => {
    switch (action) {
      case 'createTask':
      case 'startChat':
        navigation.navigate(action === 'createTask' ? 'Tasks' : 'Chat' as never)
        break
      case 'postAnnouncement':
        navigation.navigate('Announcements' as never)
        break
      case 'calendar':
        navigation.navigate('Calendar' as never)
        break
    }
  }, [navigation])

  const navigateToChat = useCallback(() => {
    navigation.navigate('Chat' as never)
  }, [navigation])

  const navigateToTasks = useCallback(() => {
    navigation.navigate('Tasks' as never)
  }, [navigation])

  const navigateToProfile = useCallback(() => {
    navigation.navigate('Profile' as never)
  }, [navigation])

  return (
    <View style={styles.container}>
      <HomeHeader 
        userEmail={user?.email} 
        onProfilePress={navigateToProfile}
      />

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
          <TodaysOverview
            unreadMessages={stats.unreadMessages}
            pendingTasks={stats.pendingTasks}
            onMessagesPress={navigateToChat}
            onTasksPress={navigateToTasks}
          />

          <QuickActionsSection
            onStartChat={() => handleQuickAction('startChat')}
            onCreateTask={() => handleQuickAction('createTask')}
            onPostAnnouncement={() => handleQuickAction('postAnnouncement')}
            onOpenCalendar={() => handleQuickAction('calendar')}
          />
        </Animated.View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 24,
  },
  content: {
    flex: 1,
  },
})