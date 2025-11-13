// components/chat/UnreadSeparator.tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface UnreadSeparatorProps {
  unreadCount?: number
}

export const UnreadSeparator: React.FC<UnreadSeparatorProps> = ({ unreadCount }) => {
  return (
    <View style={styles.separatorContainer}>
      <View style={styles.line} />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {unreadCount !== undefined && unreadCount > 0
            ? `${unreadCount} new message${unreadCount > 1 ? 's' : ''}`
            : 'New messages'}
        </Text>
      </View>
      <View style={styles.line} />
    </View>
  )
}

const styles = StyleSheet.create({
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  badge: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
})

