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
      <View style={styles.statCardWrapper}>
        <StatCard
          icon="💬"
          iconBgColor="#eef2ff"
          count={unreadMessages}
          label="Unread Messages"
          actionText="View chats →"
          onPress={onMessagesPress}
        />
      </View>
      
      <View style={styles.statCardWrapper}>
        <StatCard
          icon="✓"
          iconBgColor="#fef3c7"
          count={pendingTasks}
          label="Pending Tasks"
          actionText="View tasks →"
          onPress={onTasksPress}
        />
      </View>
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
  statCardWrapper: {
    flex: 1,
    borderRadius: 16, // Match the card's border radius
    overflow: 'hidden', // This contains the shadow properly
  },
})