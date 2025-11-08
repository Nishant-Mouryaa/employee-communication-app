// components/home/StatsSection.tsx
import React from 'react'
import { View, StyleSheet } from 'react-native'
import { StatCard } from './StatCard'

interface StatsSectionProps {
  unreadMessages: number
  pendingTasks: number
  onMessagesPress: () => void
  onTasksPress: () => void
}

export const StatsSection: React.FC<StatsSectionProps> = ({
  unreadMessages,
  pendingTasks,
  onMessagesPress,
  onTasksPress
}) => {
  return (
    <View style={styles.statsContainer}>
      <StatCard
        icon="💬"
        iconBgColor="#eef2ff"
        borderColor="#6366f1"
        count={unreadMessages}
        label="Unread Messages"
        actionText="View chats →"
        onPress={onMessagesPress}
      />
      
      <StatCard
        icon="✓"
        iconBgColor="#fef3c7"
        borderColor="#f59e0b"
        count={pendingTasks}
        label="Pending Tasks"
        actionText="View tasks →"
        onPress={onTasksPress}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 12,
    gap: 12,
  },
})