// components/chat/MessageInput.tsx
import React, { useState, useEffect } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, Text, ActivityIndicator, Platform, Image } from 'react-native'
import { IS_MOBILE, MESSAGE_MAX_LENGTH } from '../../constants/chat'
import { Message, PendingAttachment, Profile } from '../../types/chat'
import { ReplyPreview } from './ReplyPreview'
import { MentionList } from './MentionList'
import { formatFileSize } from '../../utils/chatHelpers'

interface MessageInputProps {
  value: string
  onChangeText: (text: string) => void
  onSend: () => void
  placeholder: string
  sending: boolean
  onTyping: () => void
  replyingTo?: Message | null
  onCancelReply?: () => void
  channelMembers?: Map<string, Profile>  // Add this
  attachments?: PendingAttachment[]
  onAttachPress?: () => void
  onRemoveAttachment?: (id: string) => void
  uploadingAttachments?: boolean
}

export const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChangeText,
  onSend,
  placeholder,
  sending,
  onTyping,
  replyingTo,
  onCancelReply,
  channelMembers,
  attachments = [],
  onAttachPress,
  onRemoveAttachment,
  uploadingAttachments = false,
}) => {
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)

  // Detect @ mentions
  useEffect(() => {
    const textBeforeCursor = value.substring(0, cursorPosition)
    const atMatch = textBeforeCursor.match(/@(\w*)$/)
    
    if (atMatch) {
      setShowMentions(true)
      setMentionQuery(atMatch[1])
    } else {
      setShowMentions(false)
      setMentionQuery('')
    }
  }, [value, cursorPosition])

  const handleChangeText = (text: string) => {
    onChangeText(text)
    onTyping()
  }

  const handleSelectionChange = (event: any) => {
    setCursorPosition(event.nativeEvent.selection.start)
  }

  const handleSelectMention = (member: Profile) => {
    const textBeforeCursor = value.substring(0, cursorPosition)
    const textAfterCursor = value.substring(cursorPosition)
    
    // Find the @ symbol position
    const atIndex = textBeforeCursor.lastIndexOf('@')
    
    if (atIndex !== -1) {
      // Replace from @ to cursor with the mention
      const beforeAt = textBeforeCursor.substring(0, atIndex)
      const mention = `@${member.username} `
      const newText = beforeAt + mention + textAfterCursor
      
      onChangeText(newText)
      setShowMentions(false)
      
      // Set cursor position after the mention
      setTimeout(() => {
        setCursorPosition(beforeAt.length + mention.length)
      }, 0)
    }
  }

  const hasText = value.trim().length > 0
  const hasAttachments = attachments.length > 0
  const canSend = (hasText || hasAttachments) && !sending && !uploadingAttachments

  const members = channelMembers ? Array.from(channelMembers.values()) : []

  const renderAttachmentPreview = (attachment: PendingAttachment) => {
    const handleRemove = () => {
      if (onRemoveAttachment) {
        onRemoveAttachment(attachment.id)
      }
    }

    const sizeLabel = formatFileSize(attachment.size)

    if (attachment.type === 'image') {
      return (
        <View key={attachment.id} style={styles.attachmentItemImage}>
          <Image source={{ uri: attachment.uri }} style={styles.attachmentImage} />
          {(attachment.name || sizeLabel) && (
            <View style={styles.attachmentImageCaption}>
              {attachment.name ? (
                <Text style={styles.attachmentImageName} numberOfLines={1}>
                  {attachment.name}
                </Text>
              ) : null}
              {sizeLabel ? (
                <Text style={styles.attachmentImageSize}>
                  {sizeLabel}
                </Text>
              ) : null}
            </View>
          )}
          {onRemoveAttachment && (
            <TouchableOpacity style={styles.removeAttachmentButton} onPress={handleRemove}>
              <Text style={styles.removeAttachmentText}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      )
    }

    return (
      <View key={attachment.id} style={styles.attachmentItemFile}>
        <View style={styles.attachmentFileIcon}>
          <Text style={styles.attachmentFileIconText}>📎</Text>
        </View>
        <View style={styles.attachmentFileInfo}>
          <Text style={styles.attachmentFileName} numberOfLines={1}>
            {attachment.name || 'Attachment'}
          </Text>
          <Text style={styles.attachmentFileMeta} numberOfLines={1}>
            {[attachment.mime_type, sizeLabel].filter(Boolean).join(' • ')}
          </Text>
        </View>
        {onRemoveAttachment && (
          <TouchableOpacity style={styles.removeAttachmentButtonCompact} onPress={handleRemove}>
            <Text style={styles.removeAttachmentText}>×</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  if (IS_MOBILE) {
    return (
      <View style={styles.inputWrapperMobile}>
        {showMentions && members.length > 0 && (
          <MentionList
            members={members}
            onSelectMention={handleSelectMention}
            searchQuery={mentionQuery}
          />
        )}
        {replyingTo && (
          <View style={styles.replyPreviewContainer}>
            <ReplyPreview
              message={replyingTo}
              onCancel={onCancelReply}
            />
          </View>
        )}
        {attachments.length > 0 && (
          <View style={styles.attachmentsContainerMobile}>
            {attachments.map(renderAttachmentPreview)}
          </View>
        )}
        <View style={styles.inputContainerMobile}>
          {onAttachPress && (
            <TouchableOpacity
              style={[
                styles.attachButtonMobile,
                (sending || uploadingAttachments) && styles.attachButtonDisabled
              ]}
              onPress={onAttachPress}
              disabled={sending || uploadingAttachments}
            >
              <Text style={styles.attachButtonText}>+</Text>
            </TouchableOpacity>
          )}
          <TextInput
            style={styles.textInputMobile}
            value={value}
            onChangeText={handleChangeText}
            onSelectionChange={handleSelectionChange}
            placeholder={placeholder}
            placeholderTextColor="#999"
            multiline
            maxLength={MESSAGE_MAX_LENGTH}
            editable={!sending && !uploadingAttachments}
          />
          <TouchableOpacity 
            style={[styles.sendButtonMobile, !canSend && styles.sendButtonDisabled]} 
            onPress={onSend}
            disabled={!canSend}
          >
            {sending || uploadingAttachments ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.sendButtonText}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.inputWrapper}>
      {showMentions && members.length > 0 && (
        <MentionList
          members={members}
          onSelectMention={handleSelectMention}
          searchQuery={mentionQuery}
        />
      )}
      {replyingTo && (
        <View style={styles.replyPreviewContainer}>
          <ReplyPreview
            message={replyingTo}
            onCancel={onCancelReply}
          />
        </View>
      )}
      {attachments.length > 0 && (
        <View style={styles.attachmentsContainer}>
          {attachments.map(renderAttachmentPreview)}
        </View>
      )}
      <View style={styles.inputContainer}>
        {onAttachPress && (
          <TouchableOpacity
            style={[
              styles.attachButton,
              (sending || uploadingAttachments) && styles.attachButtonDisabled
            ]}
            onPress={onAttachPress}
            disabled={sending || uploadingAttachments}
          >
            <Text style={styles.attachButtonIcon}>📎</Text>
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={handleChangeText}
          onSelectionChange={handleSelectionChange}
          placeholder={placeholder}
          placeholderTextColor="#999"
          multiline
          maxLength={MESSAGE_MAX_LENGTH}
          editable={!sending && !uploadingAttachments}
        />
        <TouchableOpacity 
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]} 
          onPress={onSend}
          disabled={!canSend}
        >
          {sending || uploadingAttachments ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  inputWrapper: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  inputWrapperMobile: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  replyPreviewContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-end',
  },
  attachmentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  inputContainerMobile: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 12,
    alignItems: 'flex-end',
  },
  attachmentsContainerMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 15,
    backgroundColor: '#f8fafc',
  },
  textInputMobile: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 15,
    backgroundColor: '#f8fafc',
  },
  sendButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonMobile: {
    backgroundColor: '#6366F1',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attachButtonMobile: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  attachButtonDisabled: {
    opacity: 0.6,
  },
  attachButtonIcon: {
    fontSize: 18,
  },
  attachButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#475569',
  },
  attachmentItemImage: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
  },
  attachmentImageCaption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  attachmentImageName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  attachmentImageSize: {
    fontSize: 9,
    color: '#cbd5f5',
    marginTop: 2,
  },
  removeAttachmentButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeAttachmentButtonCompact: {
    marginLeft: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeAttachmentText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 15,
  },
  attachmentItemFile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 220,
  },
  attachmentFileIcon: {
    marginRight: 12,
  },
  attachmentFileIconText: {
    fontSize: 18,
  },
  attachmentFileInfo: {
    flex: 1,
  },
  attachmentFileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  attachmentFileMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
})