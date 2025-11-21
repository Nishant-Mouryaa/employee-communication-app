// components/chat/MessageInput.tsx
import React, { useState, useEffect } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, Text, ActivityIndicator, Platform, Image } from 'react-native'
import { IS_MOBILE, MESSAGE_MAX_LENGTH } from '../../constants/chat'
import { Message, PendingAttachment, Profile } from '../../types/chat'
import { ReplyPreview } from './ReplyPreview'
import { MentionList } from './MentionList'
import { formatFileSize } from '../../utils/chatHelpers'

const COMMON_EMOJIS = ['😀', '😅', '😂', '🥹', '😍', '🤔', '🙌', '🔥', '🎉', '🙏']
const SLASH_COMMANDS = [
  { command: 'giphy', description: 'Search for a GIF', insert: '/giphy ' },
  { command: 'shrug', description: 'Insert ¯\\_(ツ)_/¯', insert: '¯\\_(ツ)_/¯ ' },
  { command: 'tableflip', description: 'Flip the table', insert: '(╯°□°）╯︵ ┻━┻ ' },
  { command: 'away', description: 'Set status to away', insert: '/away ' },
  { command: 'me', description: 'Highlight an action message', insert: '/me ' },
]

interface MessageInputProps {
  value: string
  onChangeText: (text: string) => void
  onSend: () => void
  placeholder: string
  sending: boolean
  onTyping: () => void
  replyingTo?: Message | null
  onCancelReply?: () => void
  channelMembers?: Map<string, Profile>
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
  const [showEmojiTray, setShowEmojiTray] = useState(false)
  const [showSlashMenu, setShowSlashMenu] = useState(false)

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

  const insertAtCursor = (textToInsert: string) => {
    const before = value.substring(0, cursorPosition)
    const after = value.substring(cursorPosition)
    const newText = `${before}${textToInsert}${after}`
    onChangeText(newText)
    onTyping()
    const newPosition = before.length + textToInsert.length
    setTimeout(() => {
      setCursorPosition(newPosition)
    }, 0)
  }

  const handleSelectionChange = (event: any) => {
    setCursorPosition(event.nativeEvent.selection.start)
  }

  const handleSelectMention = (member: Profile) => {
    const textBeforeCursor = value.substring(0, cursorPosition)
    const textAfterCursor = value.substring(cursorPosition)
    
    const atIndex = textBeforeCursor.lastIndexOf('@')
    
    if (atIndex !== -1) {
      const beforeAt = textBeforeCursor.substring(0, atIndex)
      const mention = `@${member.username} `
      const newText = beforeAt + mention + textAfterCursor
      
      onChangeText(newText)
      setShowMentions(false)
      
      setTimeout(() => {
        setCursorPosition(beforeAt.length + mention.length)
      }, 0)
    }
  }

  const handleEmojiToggle = () => {
    setShowEmojiTray(prev => !prev)
    setShowSlashMenu(false)
  }

  const handleEmojiSelect = (emoji: string) => {
    insertAtCursor(`${emoji} `)
    setShowEmojiTray(false)
  }

  const handleSlashToggle = () => {
    setShowSlashMenu(prev => !prev)
    setShowEmojiTray(false)
  }

  const handleSlashCommandSelect = (item: typeof SLASH_COMMANDS[number]) => {
    insertAtCursor(item.insert)
    setShowSlashMenu(false)
  }

  const handleAttachPress = () => {
    if (onAttachPress) {
      setShowEmojiTray(false)
      setShowSlashMenu(false)
      onAttachPress()
    }
  }

  const handleSendPress = () => {
    setShowEmojiTray(false)
    setShowSlashMenu(false)
    onSend()
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
        {showEmojiTray && (
          <View style={styles.emojiTray}>
            {COMMON_EMOJIS.map(emoji => (
              <TouchableOpacity
                key={emoji}
                style={styles.emojiButton}
                onPress={() => handleEmojiSelect(emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {showSlashMenu && (
          <View style={styles.slashMenu}>
            {SLASH_COMMANDS.map(item => (
              <TouchableOpacity
                key={item.command}
                style={styles.slashCommand}
                onPress={() => handleSlashCommandSelect(item)}
              >
                <Text style={styles.slashCommandText}>/{item.command}</Text>
                <Text style={styles.slashCommandDescription}>{item.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {attachments.length > 0 && (
          <View style={styles.attachmentsContainerMobile}>
            {attachments.map(renderAttachmentPreview)}
          </View>
        )}
        <View style={styles.inputContainerMobile}>
          {/* Left side buttons */}
          <View style={styles.leftButtonsMobile}>
            <TouchableOpacity
              style={[
                styles.inlineIconButtonMobile,
                showEmojiTray && styles.inlineIconButtonActive
              ]}
              onPress={handleEmojiToggle}
              disabled={sending || uploadingAttachments}
            >
              <Text style={styles.inlineIconText}>😊</Text>
            </TouchableOpacity>
          </View>

          {/* Input field wrapper with integrated buttons */}
          <View style={styles.inputFieldWrapperMobile}>
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
            
            {/* Right side inline buttons */}
            <View style={styles.inputRightActionsMobile}>
              {onAttachPress && (
                <TouchableOpacity
                  style={[
                    styles.inlineIconButtonMobile,
                    (sending || uploadingAttachments) && styles.inlineIconButtonDisabled
                  ]}
                  onPress={handleAttachPress}
                  disabled={sending || uploadingAttachments}
                >
                  <Text style={styles.inlineIconText}>📎</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.inlineIconButtonMobile,
                  showSlashMenu && styles.inlineIconButtonActive
                ]}
                onPress={handleSlashToggle}
                disabled={sending || uploadingAttachments}
              >
                <Text style={styles.inlineIconTextSmall}>/</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Send button */}
          <TouchableOpacity 
            style={[styles.sendButtonMobile, !canSend && styles.sendButtonDisabled]} 
            onPress={handleSendPress}
            disabled={!canSend}
          >
            {sending || uploadingAttachments ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.sendButtonIcon}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // Desktop layout
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
      {showEmojiTray && (
        <View style={styles.emojiTrayDesktop}>
          {COMMON_EMOJIS.map(emoji => (
            <TouchableOpacity
              key={emoji}
              style={styles.emojiButtonDesktop}
              onPress={() => handleEmojiSelect(emoji)}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {showSlashMenu && (
        <View style={styles.slashMenuDesktop}>
          {SLASH_COMMANDS.map(item => (
            <TouchableOpacity
              key={item.command}
              style={styles.slashCommand}
              onPress={() => handleSlashCommandSelect(item)}
            >
              <Text style={styles.slashCommandText}>/{item.command}</Text>
              <Text style={styles.slashCommandDescription}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {attachments.length > 0 && (
        <View style={styles.attachmentsContainer}>
          {attachments.map(renderAttachmentPreview)}
        </View>
      )}
      <View style={styles.inputContainer}>
        {/* Left emoji button */}
        <View style={styles.leftButtons}>
          <TouchableOpacity
            style={[
              styles.inlineIconButton,
              showEmojiTray && styles.inlineIconButtonActive
            ]}
            onPress={handleEmojiToggle}
            disabled={sending || uploadingAttachments}
          >
            <Text style={styles.inlineIconText}>😊</Text>
          </TouchableOpacity>
        </View>

        {/* Input field wrapper with integrated buttons */}
        <View style={styles.inputFieldWrapper}>
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
          
          {/* Right side inline buttons */}
          <View style={styles.inputRightActions}>
            {onAttachPress && (
              <TouchableOpacity
                style={[
                  styles.inlineIconButton,
                  (sending || uploadingAttachments) && styles.inlineIconButtonDisabled
                ]}
                onPress={handleAttachPress}
                disabled={sending || uploadingAttachments}
              >
                <Text style={styles.inlineIconText}>📎</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.inlineIconButton,
                showSlashMenu && styles.inlineIconButtonActive
              ]}
              onPress={handleSlashToggle}
              disabled={sending || uploadingAttachments}
            >
              <Text style={styles.inlineIconTextSmall}>/</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Send button */}
        <TouchableOpacity 
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]} 
          onPress={handleSendPress}
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
    gap: 12,
  },
  inputContainerMobile: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 12,
    alignItems: 'flex-end',
    gap: 8,
  },
  attachmentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  attachmentsContainerMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  
  // Left buttons container
  leftButtons: {
    justifyContent: 'flex-end',
    paddingBottom: 12,
  },
  leftButtonsMobile: {
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },

  // Input field wrapper with integrated buttons
  inputFieldWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
  },
  inputFieldWrapperMobile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },

  // Text input (no border, fills space)
  textInput: {
    flex: 1,
    paddingVertical: 6,
    paddingRight: 8,
    maxHeight: 100,
    fontSize: 15,
    color: '#1e293b',
  },
  textInputMobile: {
    flex: 1,
    paddingVertical: 6,
    paddingRight: 6,
    maxHeight: 100,
    fontSize: 15,
    color: '#1e293b',
  },

  // Right side actions inside input
  inputRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 2,
  },
  inputRightActionsMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingBottom: 2,
  },

  // Inline icon buttons (inside input field)
  inlineIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  inlineIconButtonMobile: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  inlineIconButtonActive: {
    backgroundColor: '#e0e7ff',
  },
  inlineIconButtonDisabled: {
    opacity: 0.5,
  },
  inlineIconText: {
    fontSize: 20,
  },
  inlineIconTextSmall: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
  },

  // Send button
  sendButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
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
  sendButtonIcon: {
    color: 'white',
    fontSize: 18,
  },

  // Attachment previews
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

  // Emoji tray
  emojiTray: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  emojiTrayDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  emojiButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  emojiButtonDesktop: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  emojiText: {
    fontSize: 22,
  },

  // Slash menu
  slashMenu: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  slashMenuDesktop: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  slashCommand: {
    paddingVertical: 6,
  },
  slashCommandText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  slashCommandDescription: {
    fontSize: 12,
    color: '#64748b',
  },
})