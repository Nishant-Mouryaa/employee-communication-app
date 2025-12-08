// components/chat/ChannelList.tsx
import React, { useState } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  RefreshControl, 
  Image,
  TextInput
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Channel } from '../../types/chat'
import { getUserInitials } from '../../utils/chatHelpers'
import { Platform } from 'react-native'

type FilterType = 'all' | 'groups' | 'personal'

const FilterButton = ({ 
  type, 
  isActive, 
  onPress, 
  label 
}: { 
  type: FilterType
  isActive: boolean
  onPress: (type: FilterType) => void
  label: string
}) => (
  <TouchableOpacity
    style={[styles.filterButton, isActive && styles.filterButtonActive]}
    onPress={() => onPress(type)}
    activeOpacity={0.7}
  >
    <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
)

const ChannelItem = ({ 
  channel, 
  isSelected, 
  onSelect 
}: { 
  channel: Channel
  isSelected: boolean
  onSelect: () => void 
}) => {
  const isDM = channel.type === 'direct'
  const displayName = isDM && channel.dm_user 
    ? channel.dm_user.full_name || channel.dm_user.username
    : channel.name

  // Get position and department for DMs
  const position = isDM ? channel.dm_user?.position : null
  const department = isDM ? channel.dm_user?.department : null
  const roleInfo = [position, department].filter(Boolean).join(' • ')

  // For group channels, show first letter
  const getChannelAvatar = () => {
    if (isDM) {
      // DM avatar
      if (channel.dm_user?.avatar_url) {
        return (
          <Image 
            source={{ uri: channel.dm_user.avatar_url }} 
            style={styles.avatar}
          />
        )
      } else {
        return (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>
              {getUserInitials(displayName)}
            </Text>
          </View>
        )
      }
    } else {
      // Group channel avatar - show first letter
      const firstLetter = channel.name.charAt(0).toUpperCase()
      return (
        <View style={[styles.avatar, styles.groupAvatar]}>
          <Text style={styles.groupAvatarText}>{firstLetter}</Text>
        </View>
      )
    }
  }

  // Format last message preview
  const getLastMessagePreview = () => {
    if (channel.last_message) {
      const content = channel.last_message.content || ''
      if (content.length > 40) {
        return content.substring(0, 40) + '...'
      }
      return content
    }
    return 'No messages yet'
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays === 1) return '1d'
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Get time indicator text
  const getTimeIndicator = () => {
    if (channel.last_message) {
      return formatTimestamp(channel.last_message.created_at)
    }
    return ''
  }

  return (
    <TouchableOpacity
      style={[styles.channelItem, isSelected && styles.selectedChannel]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {getChannelAvatar()}
        {isDM && channel.dm_user?.is_online && (
          <View style={styles.onlineIndicator} />
        )}
      </View>
      
      <View style={styles.channelInfo}>
        <View style={styles.headerRow}>
          <Text style={styles.channelName} numberOfLines={1}>
            {displayName}
          </Text>
          {channel.last_message && (
            <Text style={styles.timestamp}>
              {getTimeIndicator()}
            </Text>
          )}
        </View>
        
        <View style={styles.contentRow}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {getLastMessagePreview()}
          </Text>
          
          {!isDM && channel.member_count !== undefined && channel.member_count > 0 && (
            <View style={styles.memberCountInline}>
              <Ionicons name="people" size={12} color="#6A727C" />
              <Text style={styles.memberCountText}>
                {channel.member_count}
              </Text>
            </View>
          )}
          
          {channel.unread_count > 0 && (
            <View style={styles.unreadBadgeInline}>
              <Text style={styles.unreadCountInline}>
                {channel.unread_count > 99 ? '99+' : channel.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

export const ChannelList: React.FC<{
  channels: Channel[]
  selectedChannelId?: string
  onChannelSelect: (channel: Channel) => void
  refreshing?: boolean
  onRefresh?: () => void
  onNewChat?: () => void // New prop for new chat button
  currentUserEmail?: string // For header subtitle
}> = ({ 
  channels, 
  selectedChannelId, 
  onChannelSelect, 
  refreshing, 
  onRefresh,
  onNewChat,
  currentUserEmail 
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Remove duplicates based on channel ID
  const uniqueChannels = React.useMemo(() => {
    const seen = new Set()
    return channels.filter(channel => {
      if (seen.has(channel.id)) {
        return false
      }
      seen.add(channel.id)
      return true
    })
  }, [channels])

  // Filter channels based on search query
  const filteredBySearch = React.useMemo(() => {
    if (!searchQuery.trim()) return uniqueChannels
    
    const query = searchQuery.toLowerCase().trim()
    return uniqueChannels.filter(channel => {
      const isDM = channel.type === 'direct'
      const displayName = isDM && channel.dm_user 
        ? channel.dm_user.full_name || channel.dm_user.username
        : channel.name
      
      // Search in display name
      if (displayName.toLowerCase().includes(query)) return true
      
      // Search in last message content
      if (channel.last_message?.content?.toLowerCase().includes(query)) return true
      
      return false
    })
  }, [uniqueChannels, searchQuery])

  // Separate channels and DMs
  const regularChannels = filteredBySearch.filter(c => c.type !== 'direct')
  const directMessages = filteredBySearch.filter(c => c.type === 'direct')

  // Filter channels based on active filter
  const filteredChannels = React.useMemo(() => {
    switch (activeFilter) {
      case 'groups':
        return regularChannels
      case 'personal':
        return directMessages
      case 'all':
      default:
        return [...regularChannels, ...directMessages]
    }
  }, [activeFilter, regularChannels, directMessages])

  // Sort by last message timestamp (most recent first)
  const sortedChannels = React.useMemo(() => {
    return filteredChannels.sort((a, b) => {
      const timeA = a.last_message ? new Date(a.last_message.created_at).getTime() : 0
      const timeB = b.last_message ? new Date(b.last_message.created_at).getTime() : 0
      return timeB - timeA
    })
  }, [filteredChannels])

  // Get counts for filter buttons
  const allCount = regularChannels.length + directMessages.length
  const groupsCount = regularChannels.length
  const personalCount = directMessages.length

  // Get username from email for subtitle
  const getUsernameFromEmail = (email?: string) => {
    if (!email) return 'Your conversations'
    return email.split('@')[0]
  }

  return (
    <View style={styles.container}>
      {/* Navy Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Chats</Text>
            <Text style={styles.subtitle}>
              {currentUserEmail ? `Welcome, ${getUsernameFromEmail(currentUserEmail)}!` : 'Your conversations'}
            </Text>
          </View>
          
          {onNewChat && (
            <TouchableOpacity
              style={styles.newChatButton}
              onPress={onNewChat}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="add-outline" size={24} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Integrated Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6A727C" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search chats..."
            placeholderTextColor="#6A727C"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <FilterButton
          type="all"
          isActive={activeFilter === 'all'}
          onPress={setActiveFilter}
          label={`All (${allCount})`}
        />
        <FilterButton
          type="groups"
          isActive={activeFilter === 'groups'}
          onPress={setActiveFilter}
          label={`Groups (${groupsCount})`}
        />
        <FilterButton
          type="personal"
          isActive={activeFilter === 'personal'}
          onPress={setActiveFilter}
          label={`Personal (${personalCount})`}
        />
      </View>

      {/* Empty State */}
      {sortedChannels.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons 
            name={activeFilter === 'groups' ? "people-outline" : "chatbubble-outline"} 
            size={64} 
            color="#E1E6EC" 
          />
          <Text style={styles.emptyStateTitle}>
            {activeFilter === 'groups' 
              ? 'No group chats' 
              : activeFilter === 'personal' 
              ? 'No personal chats' 
              : 'No conversations'
            }
          </Text>
          <Text style={styles.emptyStateSubtitle}>
            {activeFilter === 'groups' 
              ? 'Group chats will appear here when available' 
              : activeFilter === 'personal' 
              ? 'Start a conversation to see personal chats here' 
              : 'Start a conversation to see chats here'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedChannels}
          renderItem={({ item }) => (
            <ChannelItem
              channel={item}
              isSelected={item.id === selectedChannelId}
              onSelect={() => onChannelSelect(item)}
            />
          )}
          keyExtractor={(item) => item.id}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing || false}
                onRefresh={onRefresh}
                tintColor="#27A4BA"
              />
            ) : undefined
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  header: {
    backgroundColor: '#1C2A4A',
    paddingBottom: 16,
    borderBottomEndRadius: 16,
    borderBottomStartRadius: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Inter',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Inter',
    marginTop: 2,
  },
  newChatButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Inter',
    fontWeight: '400',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E6EC',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F7F8FA',
    marginRight: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#1C2A4A',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A727C',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Inter',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingTop: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#E1E6EC',
    marginLeft: 20,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  selectedChannel: {
    backgroundColor: '#F0F4FF',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarFallback: {
    backgroundColor: '#27A4BA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatar: {
    backgroundColor: '#1C2A4A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Inter',
  },
  groupAvatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Inter',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: 'white',
  },
  channelInfo: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E2A32',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Inter',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#6A727C',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Inter',
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6A727C',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Inter',
    fontWeight: '400',
    flex: 1,
    marginRight: 8,
  },
  memberCountInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 8,
  },
  memberCountText: {
    fontSize: 12,
    color: '#6A727C',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Inter',
  },
  unreadBadgeInline: {
    backgroundColor: '#27A4BA',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCountInline: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Inter',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F7F8FA',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E2A32',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Inter',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6A727C',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Inter',
    textAlign: 'center',
    lineHeight: 20,
  },
})