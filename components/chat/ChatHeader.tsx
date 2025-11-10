// components/chat/ChatHeader.tsx
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native'
import { IS_MOBILE } from '../../constants/chat'
import { Ionicons } from '@expo/vector-icons'

interface ChatHeaderProps {
  channelName?: string
  unreadCount: number
  onChannelPress: () => void
  onMembersPress: () => void
  memberCount?: number
  isOnline?: boolean
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  channelName,
  unreadCount,
  onChannelPress,
  onMembersPress,
  memberCount = 0,
  isOnline = true
}) => {
  if (IS_MOBILE) {
    return (
      <View style={styles.mobileHeader}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.channelButton} 
            onPress={onChannelPress}
            activeOpacity={0.7}
          >
            <View style={styles.channelInfo}>
              <Text style={styles.channelButtonHash}>#</Text>
              <View style={styles.channelTextContainer}>
                <Text style={styles.channelButtonText} numberOfLines={1}>
                  {channelName || 'Select Channel'}
                </Text>
                {channelName && (
                  <View style={styles.statusContainer}>
                    <View style={[styles.statusDot, isOnline ? styles.online : styles.offline]} />
                    <Text style={styles.statusText}>
                      {isOnline ? 'Online' : 'Offline'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
            {unreadCount > 0 && (
              <View style={styles.headerUnreadBadge}>
                <Text style={styles.unreadText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
            
            <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.membersButton} 
          onPress={onMembersPress}
          activeOpacity={0.7}
        >
          <Ionicons name="people-outline" size={20} color="white" />
          {memberCount > 0 && (
            <View style={styles.memberCountBadge}>
              <Text style={styles.memberCountText}>{memberCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.header}>
      <View style={styles.desktopHeaderContent}>
        <View>
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSubtitle}>Team communication</Text>
        </View>
        
        <View style={styles.desktopStats}>
          <View style={styles.statItem}>
            <Ionicons name="chatbubbles-outline" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.statText}>Active</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.desktopMembersButton}
            onPress={onMembersPress}
          >
            <Ionicons name="people-outline" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.statText}>{memberCount} members</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#6366F1',
    paddingTop: Platform.OS === 'web' ? 40 : 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  desktopHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  desktopStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  desktopMembersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  mobileHeader: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  channelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    flex: 1,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  channelTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  channelButtonHash: {
    fontSize: 20,
    fontWeight: '800',
    color: 'white',
  },
  channelButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: 'white',
    marginBottom: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  online: {
    backgroundColor: '#10B981',
  },
  offline: {
    backgroundColor: '#6B7280',
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  membersButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 12,
    borderRadius: 16,
    position: 'relative',
  },
  memberCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  memberCountText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  headerUnreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
    marginRight: 8,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
  },
})