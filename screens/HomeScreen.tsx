// screens/HomeScreen.tsx
import React, { useEffect, useRef, useCallback } from 'react'
import { 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  Animated
} from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { useNavigation } from '@react-navigation/native'
import { useHomeData } from '../hooks/useHomeData'
import { useRealtimeSubscriptions } from '../hooks/useRealtimeSubscriptions'
import { HomeHeader } from '../components/home/HomeHeader'
import { StatsSection } from '../components/home/StatsSection'
import { QuickActionsSection } from '../components/home/QuickActionsSection'
import { QuickAction } from '../types/home'
import { SafeAreaView } from 'react-native-safe-area-context'


export default function HomeScreen() {
  const { user } = useAuth()
  const navigation = useNavigation()
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

  // Setup realtime subscriptions
  useRealtimeSubscriptions({
    userId: user?.id,
    onMessageChange: handleMessageChange,
    onTaskChange: handleTaskChange,
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
    <SafeAreaView style={styles.container}>
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
          <StatsSection
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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 0,
  },
})