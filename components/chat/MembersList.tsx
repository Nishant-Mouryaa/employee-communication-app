import React from 'react'
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ChannelMember } from '../../types/chat'
import { getUserInitials } from '../../utils/chatHelpers'
import { IS_MOBILE } from '../../constants/chat'

interface MembersListProps {
  members: ChannelMember[]
  isVisible: boolean
  onClose: () => void
  currentUserId?: string
  onStartDirectMessage?: (member: ChannelMember) => void // Add this prop
}

export const MembersList: React.FC<MembersListProps> = ({
  members,
  isVisible,
  onClose,
  currentUserId,
  onStartDirectMessage
}) => {
  if (!isVisible) return null

 const handleMemberPress = (member: ChannelMember) => {
  console.log('=== MembersList: handleMemberPress ===')
  console.log('Member:', member)
  console.log('CurrentUserId:', currentUserId)
  console.log('onStartDirectMessage exists?', !!onStartDirectMessage)
  
  if (member.user_id === currentUserId) {
    Alert.alert('Info', "You can't message yourself")
    return
  }
  
  if (onStartDirectMessage) {
    console.log('Calling onStartDirectMessage with member:', member)
    onStartDirectMessage(member)
    onClose()
  } else {
    console.log('ERROR: onStartDirectMessage is not provided!')
    Alert.alert('Error', 'Direct messaging is not configured')
  }
}

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
      <TouchableOpacity
        style={styles.memberItem}
        onPress={() => handleMemberPress(item)}
        disabled={isCurrentUser}
        activeOpacity={0.7}
      >
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

        {!isCurrentUser && (
          <TouchableOpacity 
            style={styles.messageButton}
            onPress={() => handleMemberPress(item)}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#6366F1" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <View style={IS_MOBILE ? styles.containerMobile : styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Channel Members</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.memberCount}>{members.length} members</Text>
        <Text style={styles.hint}>Tap on a member to start a direct message</Text>
      </View>
      
      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={(item) => item.user_id}
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />
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
  list: {
    flex: 1,
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
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  messageButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  hint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    fontStyle: 'italic',
  },
})