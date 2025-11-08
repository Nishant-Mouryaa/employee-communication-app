// components/home/QuickActionsSection.tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { QuickActionCard } from './QuickActionCard'

interface QuickActionsSectionProps {
  onStartChat: () => void
  onCreateTask: () => void
  onPostAnnouncement: () => void
  onOpenCalendar: () => void
}

export const QuickActionsSection: React.FC<QuickActionsSectionProps> = ({
  onStartChat,
  onCreateTask,
  onPostAnnouncement,
  onOpenCalendar
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <QuickActionCard
          icon="💬"
          iconBgColor="#eef2ff"
          title="Start Chat"
          onPress={onStartChat}
        />
        <QuickActionCard
          icon="📝"
          iconBgColor="#fef3c7"
          title="New Task"
          onPress={onCreateTask}
        />
        <QuickActionCard
          icon="📢"
          iconBgColor="#d1fae5"
          title="Announce"
          onPress={onPostAnnouncement}
        />
        <QuickActionCard
          icon="📅"
          iconBgColor="#fce7f3"
          title="Calendar"
          onPress={onOpenCalendar}
        />
      </View>
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
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
})