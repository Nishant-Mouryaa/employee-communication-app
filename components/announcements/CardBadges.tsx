// components/announcements/CardBadges.tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Announcement } from '../../types/announcement'

interface CardBadgesProps {
  announcement: Announcement
}

export const CardBadges: React.FC<CardBadgesProps> = ({ announcement }) => {
  if (!announcement.isImportant && !announcement.category) {
    return null
  }

  return (
    <View style={styles.badges}>
      {announcement.isImportant && (
        <View style={[styles.badge, styles.importantBadge]}>
          <Ionicons name="alert-circle" size={12} color="#DC2626" />
          <Text style={[styles.badgeText, styles.importantBadgeText]}>
            Important
          </Text>
        </View>
      )}
      
      {announcement.category && (
        <View style={[styles.badge, styles.categoryBadge]}>
          <Text style={[styles.badgeText, styles.categoryBadgeText]}>
            {announcement.category}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  badges: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  importantBadge: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  categoryBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  importantBadgeText: {
    color: '#DC2626',
  },
  categoryBadgeText: {
    color: '#1D4ED8',
  },
})