// components/announcements/AttachmentList.tsx
import React from 'react'
import { View, Text, TouchableOpacity, Linking, Alert, StyleSheet } from 'react-native'
import { Attachment } from '../../types/announcement'

interface AttachmentListProps {
  attachments: Attachment[]
}

export const AttachmentList: React.FC<AttachmentListProps> = ({ attachments }) => {
  const handleAttachmentPress = async (attachment: Attachment) => {
    try {
      const supported = await Linking.canOpenURL(attachment.file_url)
      if (supported) {
        await Linking.openURL(attachment.file_url)
      } else {
        Alert.alert('Error', 'Cannot open this file type')
      }
    } catch (error) {
      console.error('Error opening attachment:', error)
      Alert.alert('Error', 'Failed to open attachment')
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attachments:</Text>
      {attachments.map((attachment) => (
        <TouchableOpacity
          key={attachment.id}
          style={styles.attachmentItem}
          onPress={() => handleAttachmentPress(attachment)}
        >
          <Text style={styles.icon}>📎</Text>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {attachment.file_name}
            </Text>
            <Text style={styles.size}>
              {(attachment.file_size / 1024).toFixed(1)} KB
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  icon: {
    fontSize: 16,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 2,
  },
  size: {
    fontSize: 12,
    color: '#64748b',
  },
})