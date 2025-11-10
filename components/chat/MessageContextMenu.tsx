// components/chat/MessageContextMenu.tsx
import React from 'react'
import { View, Text, StyleSheet, Pressable, Modal, TouchableOpacity } from 'react-native'

interface MessageContextMenuProps {
  visible: boolean
  onClose: () => void
  position: { x: number; y: number }
  isOwnMessage: boolean
  onDelete?: () => void
  onCopy?: () => void
  onEdit?: () => void
  onReact: () => void
  onReply?: () => void
}

export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  visible,
  onClose,
  position,
  isOwnMessage,
  onDelete,
  onCopy,
  onEdit,
  onReact,
  onReply,
}) => {
  if (!visible) return null

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View 
          style={[
            styles.menu,
            { top: position.y - 100, left: position.x - 100 }
          ]}
        >
          {/* Reply - available for all messages */}
          {onReply && (
            <Pressable 
              style={styles.menuItem}
              onPress={() => {
                onReply()
                onClose()
              }}
            >
              <Text style={styles.menuIcon}>↩️</Text>
              <Text style={styles.menuText}>Reply</Text>
            </Pressable>
          )}

          <Pressable 
            style={styles.menuItem}
            onPress={() => {
              onReact()
              onClose()
            }}
          >
            <Text style={styles.menuIcon}>😀</Text>
            <Text style={styles.menuText}>Add Reaction</Text>
          </Pressable>

          {isOwnMessage && (
            <>
              {onCopy && (
                <Pressable 
                  style={styles.menuItem}
                  onPress={() => {
                    onCopy()
                    onClose()
                  }}
                >
                  <Text style={styles.menuIcon}>📋</Text>
                  <Text style={styles.menuText}>Copy</Text>
                </Pressable>
              )}

              {onEdit && (
                <Pressable 
                  style={styles.menuItem}
                  onPress={() => {
                    onEdit()
                    onClose()
                  }}
                >
                  <Text style={styles.menuIcon}>✏️</Text>
                  <Text style={styles.menuText}>Edit</Text>
                </Pressable>
              )}

              {onDelete && (
                <Pressable 
                  style={[styles.menuItem, styles.deleteItem]}
                  onPress={() => {
                    onDelete()
                    onClose()
                  }}
                >
                  <Text style={styles.menuIcon}>🗑️</Text>
                  <Text style={[styles.menuText, styles.deleteText]}>Delete</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  menu: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 12,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  deleteItem: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  menuText: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
  },
  deleteText: {
    color: '#ef4444',
  },
})