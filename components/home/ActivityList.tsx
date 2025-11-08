// components/home/ActivityList.tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Activity } from '../../types/home'
import { ActivityItem } from './ActivityItem'

interface ActivityListProps {
  activities: Activity[]
}

export const ActivityList: React.FC<ActivityListProps> = ({ activities }) => {
  if (activities.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🌟</Text>
        <Text style={styles.emptyTitle}>No Recent Activity</Text>
        <Text style={styles.emptyText}>
          Your recent messages, tasks, and announcements will appear here
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.activityContainer}>
      {activities.map((activity, index) => (
        <ActivityItem
          key={activity.id}
          activity={activity}
          isLast={index === activities.length - 1}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
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
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
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