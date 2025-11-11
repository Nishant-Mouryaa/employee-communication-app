// components/chat/MessageInput.tsx
import React, { useState, useEffect } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, Text, ActivityIndicator, Platform } from 'react-native'
import { IS_MOBILE, MESSAGE_MAX_LENGTH } from '../../constants/chat'
import { Message, Profile } from '../../types/chat'
import { ReplyPreview } from './ReplyPreview'
import { MentionList } from './MentionList'

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

  const canSend = value.trim() && !sending

  const members = channelMembers ? Array.from(channelMembers.values()) : []

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
        <View style={styles.inputContainerMobile}>
          <TextInput
            style={styles.textInputMobile}
            value={value}
            onChangeText={handleChangeText}
            onSelectionChange={handleSelectionChange}
            placeholder={placeholder}
            placeholderTextColor="#999"
            multiline
            maxLength={MESSAGE_MAX_LENGTH}
            editable={!sending}
          />
          <TouchableOpacity 
            style={[styles.sendButtonMobile, !canSend && styles.sendButtonDisabled]} 
            onPress={onSend}
            disabled={!canSend}
          >
            {sending ? (
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
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={handleChangeText}
          onSelectionChange={handleSelectionChange}
          placeholder={placeholder}
          placeholderTextColor="#999"
          multiline
          maxLength={MESSAGE_MAX_LENGTH}
          editable={!sending}
        />
        <TouchableOpacity 
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]} 
          onPress={onSend}
          disabled={!canSend}
        >
          {sending ? (
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
  inputContainerMobile: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 12,
    alignItems: 'flex-end',
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
})