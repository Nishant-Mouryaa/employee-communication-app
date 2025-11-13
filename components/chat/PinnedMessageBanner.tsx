// components/chat/PinnedMessageBanner.tsx
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Message } from '../../types/chat'
import { formatMessageTimestamp } from '../../utils/chatHelpers'

interface PinnedMessageBannerProps {
  pinnedMessage: Message | null
  onPress?: () => void
  onClose?: () => void
}

export const PinnedMessageBanner: React.FC<PinnedMessageBannerProps> = ({
  pinnedMessage,
  onPress,
  onClose,
}) => {
  if (!pinnedMessage) return null

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.bannerContent}>
        <View style={styles.pinIconContainer}>
          <Ionicons name="pin" size={16} color="#6366F1" />
        </View>
        
        <View style={styles.messagePreview}>
          <View style={styles.messageHeader}>
            <Text style={styles.authorName} numberOfLines={1}>
              {pinnedMessage.profiles?.full_name || pinnedMessage.profiles?.username || 'Unknown'}
            </Text>
            <Text style={styles.timestamp}>
              {formatMessageTimestamp(pinnedMessage.created_at)}
            </Text>
          </View>
          
          <Text style={styles.messageContent} numberOfLines={2}>
            {pinnedMessage.content || '📎 Attachment'}
          </Text>
          
          {pinnedMessage.attachments && pinnedMessage.attachments.length > 0 && (
            <View style={styles.attachmentIndicator}>
              <Ionicons name="attach" size={12} color="#64748b" />
              <Text style={styles.attachmentText}>
                {pinnedMessage.attachments.length} attachment{pinnedMessage.attachments.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
        
        {onClose && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={(e) => {
              e.stopPropagation()
              onClose()
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#eef2ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  pinIconContainer: {
    marginTop: 2,
  },
  messagePreview: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  timestamp: {
    fontSize: 11,
    color: '#64748b',
  },
  messageContent: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  attachmentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  attachmentText: {
    fontSize: 11,
    color: '#64748b',
  },
  closeButton: {
    padding: 4,
    marginTop: -4,
    marginRight: -4,
  },
})

