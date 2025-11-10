// components/chat/ChatAreaHeader.tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface ChatAreaHeaderProps {
  channelName: string
  channelDescription?: string
}

export const ChatAreaHeader: React.FC<ChatAreaHeaderProps> = ({
  channelName,
  channelDescription
}) => {
  return (
    <View style={styles.chatHeader}>
      <View style={styles.channelHeader}>
        <Text style={styles.channelTitle}>#{channelName}</Text>
        <Text style={styles.channelDescription}>
          {channelDescription || 'Team channel'}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  chatHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: 'white',
  },
  channelHeader: {
    flexDirection: 'column',
  },
  channelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  channelDescription: {
    fontSize: 14,
    color: '#64748b',
  },
})