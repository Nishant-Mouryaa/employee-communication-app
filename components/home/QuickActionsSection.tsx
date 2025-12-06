// components/home/QuickActionsSection.tsx
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface QuickActionsSectionProps {
  onStartChat: () => void
  onCreateTask: () => void
  onPostAnnouncement: () => void
  onOpenCalendar: () => void
}

interface ActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  onPress: () => void
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, title, onPress }) => (
  <TouchableOpacity 
    style={styles.actionButton}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.actionIconContainer}>
      <Ionicons name={icon} size={24} color="#374151" />
    </View>
    <Text style={styles.actionTitle}>{title}</Text>
  </TouchableOpacity>
)

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
        <ActionButton
          icon="chatbubbles-outline"
          title="Start a conversation"
          onPress={onStartChat}
        />
        <ActionButton
          icon="checkbox-outline"
          title="Create new task"
          onPress={onCreateTask}
        />
        <ActionButton
          icon="megaphone-outline"
          title="Announce something"
          onPress={onPostAnnouncement}
        />
        <ActionButton
          icon="calendar-outline"
          title="Your calendar"
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
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 20,
  },
})