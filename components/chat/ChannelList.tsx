// components/chat/ChannelList.tsx
import React from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { Channel } from '../../types/chat'

interface ChannelListProps {
  channels: Channel[]
  selectedChannelId?: string
  onChannelSelect: (channel: Channel) => void
  refreshing: boolean
  onRefresh: () => void
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  selectedChannelId,
  onChannelSelect,
  refreshing,
  onRefresh
}) => {
  return (
    <View style={styles.sidebar}>
      <Text style={styles.sidebarTitle}>CHANNELS</Text>
      <FlatList
        data={channels}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#6366F1"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.channelItem,
              selectedChannelId === item.id && styles.selectedChannel
            ]}
            onPress={() => onChannelSelect(item)}
          >
            <View style={styles.channelInfo}>
              <Text style={[
                styles.channelHash,
                selectedChannelId === item.id && styles.selectedChannelText
              ]}>#</Text>
              <Text style={[
                styles.channelName,
                selectedChannelId === item.id && styles.selectedChannelText
              ]}>
                {item.name}
              </Text>
            </View>
            {item.unread_count > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {item.unread_count > 99 ? '99+' : item.unread_count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyChannels}>
            <Text style={styles.emptyText}>No channels available</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  sidebar: {
    width: 280,
    backgroundColor: '#f8fafc',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    padding: 16,
  },
  sidebarTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 16,
    letterSpacing: 1,
  },
  channelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  selectedChannel: {
    backgroundColor: '#6366F1',
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  channelHash: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginRight: 8,
  },
  channelName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
    flex: 1,
  },
  selectedChannelText: {
    color: 'white',
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyChannels: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
})