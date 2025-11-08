// components/home/RecentActivitySection.tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Activity } from '../../types/home'
import { ActivityList } from './ActivityList'

interface RecentActivitySectionProps {
  activities: Activity[]
}

export const RecentActivitySection: React.FC<RecentActivitySectionProps> = ({ 
  activities 
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      <ActivityList activities={activities} />
    </View>
  )
}

const styles = StyleSheet.create({
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
})