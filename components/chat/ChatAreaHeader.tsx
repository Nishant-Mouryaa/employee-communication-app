// components/chat/ChatAreaHeader.tsx
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface ChatAreaHeaderProps {
  channelName: string
  channelDescription?: string
  memberCount?: number
  onInfoPress?: () => void
}

export const ChatAreaHeader: React.FC<ChatAreaHeaderProps> = ({
  channelName,
  channelDescription,
  memberCount = 0,
  onInfoPress
}) => {
  return (
    <View style={styles.chatHeader}>
      <View style={styles.channelHeader}>
        <View style={styles.channelTitleRow}>
          <Text style={styles.channelTitle}>#{channelName}</Text>
          
          <View style={styles.headerActions}>
            {memberCount > 0 && (
              <View style={styles.memberCount}>
                <Ionicons name="people" size={16} color="#64748b" />
                <Text style={styles.memberCountText}>{memberCount}</Text>
              </View>
            )}
            
            {onInfoPress && (
              <TouchableOpacity 
                style={styles.infoButton}
                onPress={onInfoPress}
              >
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
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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