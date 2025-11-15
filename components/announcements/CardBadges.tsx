// components/announcements/CardBadges.tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Announcement } from '../../types/announcement'

interface CardBadgesProps {
  announcement: Announcement
}

export const CardBadges: React.FC<CardBadgesProps> = ({ announcement }) => {
  return (
    <View style={styles.badgeContainer}>
      {!announcement.is_read && (
        <View style={[styles.badge, styles.unreadBadge]}>
          <Text style={styles.badgeText}>NEW</Text>
        </View>
      )}
      {announcement.isPinned && (
        <View style={[styles.badge, styles.pinnedBadge]}>
          <Text style={styles.badgeText}>📌 Pinned</Text>
        </View>
      )}
      {announcement.isImportant && (
        <View style={[styles.badge, styles.importantBadge]}>
          <Text style={styles.badgeText}>⭐ Important</Text>
        </View>
      )}
      {announcement.categories && (
        <View style={[
          styles.badge, 
          styles.categoryBadge,
          { backgroundColor: announcement.categories.color + '20' }
        ]}>
          <Text style={[styles.badgeText, { color: announcement.categories.color }]}>
            {announcement.categories.icon} {announcement.categories.name}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
  },
  pinnedBadge: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  importantBadge: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  categoryBadge: {
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
})