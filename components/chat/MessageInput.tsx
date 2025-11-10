// components/chat/MessageInput.tsx
import React from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, Text, ActivityIndicator, Platform } from 'react-native'
import { IS_MOBILE, MESSAGE_MAX_LENGTH } from '../../constants/chat'

interface MessageInputProps {
  value: string
  onChangeText: (text: string) => void
  onSend: () => void
  placeholder: string
  sending: boolean
  onTyping: () => void
}

export const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChangeText,
  onSend,
  placeholder,
  sending,
  onTyping
}) => {
  const handleChangeText = (text: string) => {
    onChangeText(text)
    onTyping()
  }

  const canSend = value.trim() && !sending

  if (IS_MOBILE) {
    return (
      <View style={styles.inputContainerMobile}>
        <TextInput
          style={styles.textInputMobile}
          value={value}
          onChangeText={handleChangeText}
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
    )
  }

  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.textInput}
        value={value}
        onChangeText={handleChangeText}
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
  )
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    alignItems: 'flex-end',
  },
  inputContainerMobile: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
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