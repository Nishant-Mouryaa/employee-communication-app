// components/chat/ChatAreaHeader.tsx
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getUserInitials } from '../../utils/chatHelpers'

interface ChatAreaHeaderProps {
  channelName: string
  channelDescription?: string
  memberCount?: number
  onInfoPress?: () => void
  isDM?: boolean
  dmUser?: {
    full_name: string
    username: string
    avatar_url?: string
    is_online?: boolean
    last_seen?: string
  }
  onBack?: () => void // Add back button support
  showBackButton?: boolean // Add back button support
}

export const ChatAreaHeader: React.FC<ChatAreaHeaderProps> = ({
  channelName,
  channelDescription,
  memberCount = 0,
  onInfoPress,
  isDM = false,
  dmUser,
  onBack,
  showBackButton = false
}) => {
  const formatLastSeen = (lastSeen?: string, isOnline?: boolean) => {
    if (isOnline) return 'Active now'
    if (!lastSeen) return 'Offline'
    
    const date = new Date(lastSeen)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Active recently'
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
                {dmUser.is_online && <View style={styles.onlineIndicator} />}
              </View>
              <Text style={styles.dmStatus}>
                {formatLastSeen(dmUser.last_seen, dmUser.is_online)}
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
              <View style={styles.memberCount}>
                <Ionicons name="people" size={16} color="#64748b" />
                <Text style={styles.memberCountText}>{memberCount}</Text>
              </View>
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
    backgroundColor: '#10b981',
    marginLeft: 8,
  },
  dmStatus: {
    fontSize: 14,
    color: '#64748b',
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