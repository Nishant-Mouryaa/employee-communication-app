// components/chat/ChannelModal.tsx
import React from 'react'
import { Modal, View, Text, StyleSheet, Pressable, TouchableOpacity, FlatList, Platform } from 'react-native'
import { Channel } from '../../types/chat'

interface ChannelModalProps {
  visible: boolean
  channels: Channel[]
  selectedChannelId?: string
  onClose: () => void
  onSelectChannel: (channel: Channel) => void
}

export const ChannelModal: React.FC<ChannelModalProps> = ({
  visible,
  channels,
  selectedChannelId,
  onClose,
  onSelectChannel
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Channels</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={channels}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalChannelItem,
                  selectedChannelId === item.id && styles.modalSelectedChannel
                ]}
                onPress={() => onSelectChannel(item)}
              >
                <View style={styles.channelInfo}>
                  <Text style={[
                    styles.channelHash,
                    selectedChannelId === item.id && styles.selectedChannelText
                  ]}>#</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.channelName,
                      selectedChannelId === item.id && styles.selectedChannelText
                    ]}>
                      {item.name}
                    </Text>
                    <Text style={[
                      styles.channelDescriptionSmall,
                      selectedChannelId === item.id && styles.selectedChannelText
                    ]}>
                      {item.description}
                    </Text>
                  </View>
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
          />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalClose: {
    fontSize: 24,
    color: '#64748b',
    fontWeight: '300',
  },
  modalChannelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalSelectedChannel: {
    backgroundColor: '#eff6ff',
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
  },
  selectedChannelText: {
    color: '#6366F1',
  },
  channelDescriptionSmall: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
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
})