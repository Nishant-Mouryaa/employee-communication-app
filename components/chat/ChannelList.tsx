// components/chat/ChannelList.tsx
import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Channel } from '../../types/chat'
import { getUserInitials } from '../../utils/chatHelpers'

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

  // For group channels, show member avatars or channel icon
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
      // Group channel avatar - show first letter of channel name or members icon
      return (
        <View style={[styles.avatar, styles.groupAvatar]}>
          <Ionicons name="people" size={16} color="white" />
        </View>
      )
    }
  }

  // Format last message preview
  const getLastMessagePreview = () => {
    if (channel.last_message) {
      const content = channel.last_message.content || ''
      return content.length > 40 ? content.substring(0, 40) + '...' : content
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
          <Text style={[styles.channelName, isSelected && styles.selectedText]} numberOfLines={1}>
            {displayName}
          </Text>
          {channel.last_message && (
            <Text style={styles.timestamp}>
              {formatTimestamp(channel.last_message.created_at)}
            </Text>
          )}
        </View>
        
        <View style={styles.contentRow}>
          {isDM ? (
            // DM specific info - position and department
            <>
              {roleInfo ? (
                <Text style={styles.roleInfo} numberOfLines={1}>
                  {roleInfo}
                </Text>
              ) : (
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {getLastMessagePreview()}
                </Text>
              )}
            </>
          ) : (
            // Group channel info
            <>
              <Text style={styles.lastMessage} numberOfLines={1}>
                {getLastMessagePreview()}
              </Text>
              {channel.member_count !== undefined && (
                <View style={styles.memberCountInline}>
                  <Ionicons name="people" size={12} color="#94a3b8" />
                  <Text style={styles.memberCountText}>
                    {channel.member_count}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
      
      {channel.unread_count > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadCount}>
            {channel.unread_count > 99 ? '99+' : channel.unread_count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

export const ChannelList: React.FC<{
  channels: Channel[]
  selectedChannelId?: string
  onChannelSelect: (channel: Channel) => void
  refreshing?: boolean
  onRefresh?: () => void
}> = ({ channels, selectedChannelId, onChannelSelect, refreshing, onRefresh }) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

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

  // Separate channels and DMs
  const regularChannels = uniqueChannels.filter(c => c.type !== 'direct')
  const directMessages = uniqueChannels.filter(c => c.type === 'direct')

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

  return (
    <View style={styles.container}>
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
            color="#cbd5e1" 
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
            <RefreshControl
              refreshing={refreshing || false}
              onRefresh={onRefresh}
              tintColor="#6366F1"
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  listContent: {
    paddingTop: 8,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  selectedChannel: {
    backgroundColor: '#f0f4ff',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarFallback: {
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatar: {
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
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
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleInfo: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    flex: 1,
  },
  lastMessage: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
    marginRight: 8,
  },
  memberCountInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberCountText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
})