// components/chat/ChatHeader.tsx
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { IS_MOBILE } from '../../constants/chat'

interface ChatHeaderProps {
  channelName?: string
  unreadCount: number
  onChannelPress: () => void
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  channelName,
  unreadCount,
  onChannelPress
}) => {
  if (IS_MOBILE) {
    return (
      <View style={styles.mobileHeader}>
        <TouchableOpacity style={styles.channelButton} onPress={onChannelPress}>
          <Text style={styles.channelButtonHash}>#</Text>
          <Text style={styles.channelButtonText} numberOfLines={1}>
            {channelName || 'Select Channel'}
          </Text>
          {unreadCount > 0 && (
            <View style={styles.headerUnreadBadge}>
              <Text style={styles.unreadText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Messages</Text>
      <Text style={styles.headerSubtitle}>Team communication</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#6366F1',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  mobileHeader: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  channelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  channelButtonHash: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginRight: 8,
  },
  channelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    flex: 1,
  },
  headerUnreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
})