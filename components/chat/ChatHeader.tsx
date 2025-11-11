// components/chat/ChatHeader.tsx
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { IS_MOBILE } from '../../constants/chat'
import { getUserInitials } from '../../utils/chatHelpers'

interface ChatHeaderProps {
  channelName?: string
  unreadCount: number
  onChannelPress: () => void
  onMembersPress?: () => void
  memberCount?: number
  isDM?: boolean
  dmUser?: {
    full_name: string
    username: string
    avatar_url?: string
    is_online?: boolean
  }
  showBackButton?: boolean // New prop for back button
  onBackPress?: () => void // New prop for back button press
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  channelName,
  unreadCount,
  onChannelPress,
  onMembersPress,
  memberCount,
  isDM = false,
  dmUser,
  showBackButton = false, // Default to false
  onBackPress // Back button handler
}) => {
  const displayName = isDM && dmUser 
    ? dmUser.full_name || dmUser.username 
    : channelName || 'Select a channel'

  return (
    <View style={styles.container}>
      {/* Left Section - Back Button and Channel Info */}
      <View style={styles.leftSection}>
        {showBackButton && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={onBackPress}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#6366F1" />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.channelButton}
          onPress={onChannelPress}
          activeOpacity={0.7}
        >
          {isDM && dmUser ? (
            // DM Header
            <View style={styles.dmHeader}>
              {dmUser.avatar_url ? (
                <Image source={{ uri: dmUser.avatar_url }} style={styles.dmAvatar} />
              ) : (
                <View style={styles.dmAvatarFallback}>
                  <Text style={styles.dmInitials}>
                    {getUserInitials(dmUser.full_name || dmUser.username)}
                  </Text>
                </View>
              )}
              <View style={styles.dmInfo}>
                <Text style={styles.channelName} numberOfLines={1}>
                  {displayName}
                </Text>
                {dmUser.is_online && (
                  <View style={styles.onlineStatusRow}>
                    <View style={styles.onlineIndicator} />
                    <Text style={styles.onlineText}>Active now</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            // Regular Channel Header
            <>
              <Text style={styles.hashIcon}>#</Text>
              <Text style={styles.channelName} numberOfLines={1}>
                {displayName}
              </Text>
            </>
          )}
          
          {!isDM && IS_MOBILE && (
            <Ionicons name="chevron-down" size={20} color="#64748b" />
          )}
        </TouchableOpacity>
      </View>

      {/* Right Section - Actions */}
      <View style={styles.actions}>
        {onMembersPress && !isDM && memberCount !== undefined && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={onMembersPress}
          >
            <Ionicons name="people-outline" size={20} color="#64748b" />
            {memberCount > 0 && (
              <Text style={styles.memberCountText}>{memberCount}</Text>
            )}
          </TouchableOpacity>
        )}
        
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unreadCount}</Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    height: 56,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  channelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dmAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  dmAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  dmInitials: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  dmInfo: {
    flex: 1,
  },
  onlineStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 4,
  },
  onlineText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '500',
  },
  hashIcon: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '600',
    marginRight: 6,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    gap: 4,
  },
  memberCountText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
})