// components/chat/ChannelList.tsx
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Channel } from '../../types/chat'
import { getUserInitials } from '../../utils/chatHelpers'


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

  return (
    <TouchableOpacity
      style={[styles.channelItem, isSelected && styles.selectedChannel]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.channelContent}>
        <View style={styles.channelIcon}>
          {isDM ? (
            // Show avatar or initials for DM
            channel.dm_user?.avatar_url ? (
              <Image 
                source={{ uri: channel.dm_user.avatar_url }} 
                style={styles.dmAvatar}
              />
            ) : (
              <View style={styles.dmAvatarFallback}>
                <Text style={styles.dmInitials}>
                  {getUserInitials(displayName)}
                </Text>
              </View>
            )
          ) : (
            // Show hash for regular channels
            <Text style={styles.hashIcon}>#</Text>
          )}
        </View>
        
        <View style={styles.channelInfo}>
          <Text style={[styles.channelName, isSelected && styles.selectedText]}>
            {displayName}
          </Text>
         // components/chat/ChannelList.tsx (continued)
          {isDM && channel.dm_user?.is_online && (
            <View style={styles.onlineIndicator} />
          )}
        </View>
        
        {channel.unread_count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>{channel.unread_count}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

// components/chat/ChannelList.tsx
export const ChannelList: React.FC<{
  channels: Channel[]
  selectedChannelId?: string
  onChannelSelect: (channel: Channel) => void
  refreshing?: boolean
  onRefresh?: () => void
}> = ({ channels, selectedChannelId, onChannelSelect, refreshing, onRefresh }) => {
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

  return (
    <View style={styles.container}>
      <FlatList
        data={[
          { type: 'section', title: 'Channels', key: 'section-channels' },
          ...regularChannels.map(c => ({ ...c, type: 'channel', key: c.id })),
          { type: 'section', title: 'Direct Messages', key: 'section-dms' },
          ...directMessages.map(c => ({ ...c, type: 'dm', key: c.id }))
        ]}
        renderItem={({ item }) => {
          if (item.type === 'section') {
            return (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{item.title}</Text>
              </View>
            )
          }
          return (
            <ChannelItem
              channel={item}
              isSelected={item.id === selectedChannelId}
              onSelect={() => onChannelSelect(item)}
            />
          )
        }}
        keyExtractor={(item) => item.key || item.id || item.title}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || false}
            onRefresh={onRefresh}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: 12,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 16,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  channelItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 8,
    marginBottom: 2,
  },
  selectedChannel: {
    backgroundColor: '#e0e7ff',
  },
  channelContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hashIcon: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '600',
  },
  dmAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  dmAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dmInitials: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  channelInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelName: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
  },
  selectedText: {
    color: '#4f46e5',
    fontWeight: '600',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginLeft: 6,
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
})