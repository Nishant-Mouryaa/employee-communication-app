// components/home/TodaysOverview.tsx
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface TodaysOverviewProps {
  unreadMessages: number
  pendingTasks: number
  onMessagesPress: () => void
  onTasksPress: () => void
}

export const TodaysOverview: React.FC<TodaysOverviewProps> = ({
  unreadMessages,
  pendingTasks,
  onMessagesPress,
  onTasksPress
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Today's Overview</Text>
        <Text style={styles.subtitle}>Teams synced · Tasks updated 2 mins ago</Text>
        
        <View style={styles.statsContainer}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={onMessagesPress}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#d1e7f5' }]}>
              <Ionicons name="chatbubble-outline" size={24} color="#3b82f6" />
            </View>
            <Text style={styles.statTitle}>Unread Messages</Text>
            <Text style={styles.statValue}>
              {unreadMessages > 0 ? `${unreadMessages} new` : 'No new messages'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            onPress={onTasksPress}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#d1e7f5' }]}>
              <Ionicons name="checkmark-outline" size={24} color="#3b82f6" />
            </View>
            <Text style={styles.statTitle}>Pending Tasks</Text>
            <Text style={styles.statValue}>
              {pendingTasks > 0 ? `${pendingTasks} pending` : "You're all caught up!"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 13,
    color: '#6b7280',
  },
})