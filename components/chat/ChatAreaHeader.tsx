// components/chat/ChatAreaHeader.tsx
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getUserInitials } from '../../utils/chatHelpers'
import { Profile } from '../../types/chat'

interface ChatAreaHeaderProps {
  channelName: string
  channelDescription?: string
  memberCount?: number
  onInfoPress?: () => void
  onMembersPress?: () => void
  isDM?: boolean
  dmUser?: Pick<Profile, 'full_name' | 'username' | 'avatar_url' | 'is_online' | 'last_seen' | 'status'>
  onBack?: () => void // Add back button support
  showBackButton?: boolean // Add back button support
}

export const ChatAreaHeader: React.FC<ChatAreaHeaderProps> = ({
  channelName,
  channelDescription,
  memberCount = 0,
  onInfoPress,
  onMembersPress,
  isDM = false,
  dmUser,
  onBack,
  showBackButton = false
}) => {
  const formatPresence = (user?: ChatAreaHeaderProps['dmUser']) => {
    if (!user) return ''
    if (user.status) return user.status
    if (user.is_online) return 'Active now'
    if (!user.last_seen) return 'Offline'

    const date = new Date(user.last_seen)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffMinutes < 1) return 'Active just now'
    if (diffMinutes < 60) return `Active ${diffMinutes}m ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `Active ${diffHours}h ago`
    return `Active ${date.toLocaleDateString()}`
  }

  if (isDM && dmUser) {
    return (
      <View style={styles.chatHeader}>
        <View style={styles.dmHeader}>
          {/* Back Button */}
          {showBackButton && onBack && (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={onBack}
            >
              <Ionicons name="chevron-back" size={24} color="#6366F1" />
            </TouchableOpacity>
          )}
          
          <View style={styles.dmUserInfo}>
            {dmUser.avatar_url ? (
              <Image source={{ uri: dmUser.avatar_url }} style={styles.dmAvatar} />
            ) : (
              <View style={styles.dmAvatarFallback}>
                <Text style={styles.dmInitials}>
                  {getUserInitials(dmUser.full_name || dmUser.username)}
                </Text>
              </View>
            )}
            
            <View style={styles.dmTextInfo}>
              <View style={styles.dmNameRow}>
                <Text style={styles.dmName}>
                  {dmUser.full_name || dmUser.username}
                </Text>
                <View
                  style={[
                    styles.onlineIndicator,
                    dmUser.is_online
                      ? styles.indicatorOnline
                      : dmUser.status
                        ? styles.indicatorStatus
                        : styles.indicatorOffline
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.dmStatus,
                  dmUser.status
                    ? styles.dmStatusCustom
                    : dmUser.is_online
                      ? styles.dmStatusOnline
                      : styles.dmStatusOffline
                ]}
                numberOfLines={1}
              >
                {formatPresence(dmUser)}
              </Text>
            </View>
          </View>
          
          {onInfoPress && (
            <TouchableOpacity style={styles.infoButton} onPress={onInfoPress}>
              <Ionicons name="information-circle-outline" size={20} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  // Original channel header with back button
  return (
    <View style={styles.chatHeader}>
      <View style={styles.channelHeader}>
        <View style={styles.channelTitleRow}>
          {/* Back Button */}
          {showBackButton && onBack && (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={onBack}
            >
              <Ionicons name="chevron-back" size={24} color="#6366F1" />
            </TouchableOpacity>
          )}
          
          <Text style={styles.channelTitle}>#{channelName}</Text>
          
          <View style={styles.headerActions}>
            {memberCount > 0 && (
              <TouchableOpacity
                style={[
                  styles.memberCount,
                  onMembersPress && styles.memberCountInteractive
                ]}
                onPress={onMembersPress}
                activeOpacity={onMembersPress ? 0.7 : 1}
                disabled={!onMembersPress}
              >
                <Ionicons name="people" size={16} color="#64748b" />
                <Text style={styles.memberCountText}>{memberCount}</Text>
              </TouchableOpacity>
            )}
            
            {onInfoPress && (
              <TouchableOpacity style={styles.infoButton} onPress={onInfoPress}>
                <Ionicons name="information-circle-outline" size={20} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <Text style={styles.channelDescription} numberOfLines={2}>
          {channelDescription || 'Team channel for communication and collaboration'}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  chatHeader: {
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  channelHeader: {
    flexDirection: 'column',
  },
  channelTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  channelTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    flex: 1,
    marginRight: 12,
    letterSpacing: -0.5,
  },
  dmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dmUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dmAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  dmAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dmInitials: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  dmTextInfo: {
    flex: 1,
  },
  dmNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  dmName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  indicatorOnline: {
    backgroundColor: '#10b981',
  },
  indicatorOffline: {
    backgroundColor: '#94a3b8',
  },
  indicatorStatus: {
    backgroundColor: '#0ea5e9',
  },
  dmStatus: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  dmStatusOnline: {
    color: '#10b981',
  },
  dmStatusOffline: {
    color: '#94a3b8',
  },
  dmStatusCustom: {
    color: '#0ea5e9',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
  },
  memberCountInteractive: {
    backgroundColor: '#eef2ff',
  },
  memberCountText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  infoButton: {
    padding: 4,
  },
  channelDescription: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 20,
    fontWeight: '500',
  },
})