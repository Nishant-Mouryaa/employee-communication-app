// components/home/ActivityItem.tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Activity } from '../../types/home'
import { getActivityIcon, getActivityColor } from '../../utils/activityHelpers'

interface ActivityItemProps {
  activity: Activity
  isLast: boolean
}

export const ActivityItem: React.FC<ActivityItemProps> = ({ activity, isLast }) => {
  const iconColor = getActivityColor(activity.type)
  
  return (
    <View style={[styles.activityItem, isLast && styles.lastActivityItem]}>
      <View 
        style={[
          styles.activityIconContainer,
          { backgroundColor: `${iconColor}15` }
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
  )
}

const styles = StyleSheet.create({
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
})