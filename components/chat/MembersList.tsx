// Alternative version with bottom close button for mobile
import React from 'react'
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native'
import { ChannelMember } from '../../types/chat'
import { getUserInitials } from '../../utils/chatHelpers'
import { IS_MOBILE } from '../../constants/chat'

interface MembersListProps {
  members: ChannelMember[]
  isVisible: boolean
  onClose: () => void
  currentUserId?: string
}

export const MembersList: React.FC<MembersListProps> = ({
  members,
  isVisible,
  onClose,
  currentUserId
}) => {
  if (!isVisible) return null

  const formatLastSeen = (lastSeen: string | null, isOnline: boolean | null): string => {
    if (isOnline) return 'Online'
    if (!lastSeen) return 'Offline'
    
    const lastSeenDate = new Date(lastSeen)
    const now = new Date()
    const diffMs = now.getTime() - lastSeenDate.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `Last seen ${diffMins}m ago`
    if (diffHours < 24) return `Last seen ${diffHours}h ago`
    if (diffDays === 1) return 'Last seen yesterday'
    if (diffDays < 7) return `Last seen ${diffDays}d ago`
    
    return `Last seen ${lastSeenDate.toLocaleDateString()}`
  }

  const renderMember = ({ item }: { item: ChannelMember }) => {
    const isCurrentUser = item.user_id === currentUserId
    const displayName = isCurrentUser ? 'You' : item.profiles.full_name || item.profiles.username
    const status = formatLastSeen(item.profiles.last_seen || null, item.profiles.is_online || false)

    return (
      <View style={styles.memberItem}>
        <View style={styles.avatarContainer}>
          {item.profiles.avatar_url ? (
            <Image 
              source={{ uri: item.profiles.avatar_url }} 
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>
                {getUserInitials(item.profiles.full_name || item.profiles.username)}
              </Text>
            </View>
          )}
          <View 
            style={[
              styles.onlineIndicator,
              item.profiles.is_online ? styles.online : styles.offline
            ]} 
          />
        </View>
        
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {displayName}
            {isCurrentUser && <Text style={styles.youBadge}> (you)</Text>}
          </Text>
          <Text style={[
            styles.memberStatus,
            item.profiles.is_online ? styles.statusOnline : styles.statusOffline
          ]}>
            {status}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={IS_MOBILE ? styles.containerMobile : styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Channel Members</Text>
          {!IS_MOBILE && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.memberCount}>{members.length} members</Text>
      </View>
      
      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={(item) => item.user_id}
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Mobile-only close button at bottom */}
      {IS_MOBILE && (
        <TouchableOpacity style={styles.mobileCloseButton} onPress={onClose}>
          <Text style={styles.mobileCloseButtonText}>Close</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: 300,
    backgroundColor: 'white',
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
    padding: 16,
  },
  containerMobile: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
  },
  header: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  memberCount: {
    fontSize: 14,
    color: '#64748b',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#64748b',
    fontWeight: '300',
    lineHeight: 20,
    marginTop: -2,
  },
  mobileCloseButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  mobileCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  online: {
    backgroundColor: '#10b981',
  },
  offline: {
    backgroundColor: '#94a3b8',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 2,
  },
  youBadge: {
    color: '#6366F1',
    fontWeight: '500',
  },
  memberStatus: {
    fontSize: 13,
  },
  statusOnline: {
    color: '#10b981',
    fontWeight: '500',
  },
  statusOffline: {
    color: '#64748b',
  },
})