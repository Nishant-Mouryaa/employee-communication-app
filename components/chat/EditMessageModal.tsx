// components/chat/EditMessageModal.tsx
import React, { useState, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native'
import { Message } from '../../types/chat'
import { MESSAGE_MAX_LENGTH } from '../../constants/chat'

interface EditMessageModalProps {
  visible: boolean
  message: Message | null
  onClose: () => void
  onSave: (messageId: string, newContent: string) => void
}

export const EditMessageModal: React.FC<EditMessageModalProps> = ({
  visible,
  message,
  onClose,
  onSave,
}) => {
  const [editedContent, setEditedContent] = useState('')

  useEffect(() => {
    if (message) {
      setEditedContent(message.content)
    }
  }, [message])

  const handleSave = () => {
    if (message && editedContent.trim() && editedContent.trim() !== message.content) {
      onSave(message.id, editedContent.trim())
      onClose()
    }
  }

  const handleCancel = () => {
    setEditedContent(message?.content || '')
    onClose()
  }

  const hasChanges = editedContent.trim() !== message?.content && editedContent.trim() !== ''

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Edit Message</Text>
              <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              <TextInput
                style={styles.input}
                value={editedContent}
                onChangeText={setEditedContent}
                placeholder="Enter your message..."
                placeholderTextColor="#94a3b8"
                multiline
                maxLength={MESSAGE_MAX_LENGTH}
                autoFocus
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>
                {editedContent.length}/{MESSAGE_MAX_LENGTH}
              </Text>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  !hasChanges && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={!hasChanges}
              >
                <Text
                  style={[
                    styles.saveButtonText,
                    !hasChanges && styles.saveButtonTextDisabled,
                  ]}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#64748b',
    fontWeight: '400',
  },
  body: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 120,
    maxHeight: 200,
    backgroundColor: '#f8fafc',
    color: '#1e293b',
  },
  charCount: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#6366F1',
  },
  saveButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#94a3b8',
  },
})