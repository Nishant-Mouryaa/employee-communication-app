// components/chat/EmptyState.tsx
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'

interface EmptyStateProps {
  onSelectChannel?: () => void
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onSelectChannel }) => {
  return (
    <View style={styles.noChannelSelected}>
      <Text style={styles.noChannelEmoji}>💭</Text>
      <Text style={styles.noChannelText}>
        {onSelectChannel ? 'Tap to select a channel' : 'Select a channel to start chatting'}
      </Text>
      {onSelectChannel && (
        <TouchableOpacity 
          style={styles.selectChannelButton}
          onPress={onSelectChannel}
        >
          <Text style={styles.selectChannelButtonText}>Select Channel</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  noChannelSelected: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  noChannelEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  noChannelText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
    fontWeight: '500',
  },
  selectChannelButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  selectChannelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})