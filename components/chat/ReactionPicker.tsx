// components/chat/ReactionPicker.tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native'

const COMMON_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '🔥', '🎉', '🤔']

interface ReactionPickerProps {
  visible: boolean
  onReactionSelect: (emoji: string) => void
  onClose: () => void
  position?: { x: number; y: number }
}

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  visible,
  onReactionSelect,
  onClose,
  position = { x: 0, y: 0 }
}) => {
  const handleReactionSelect = (emoji: string) => {
    onReactionSelect(emoji)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={[styles.pickerContainer, { top: position.y - 60, left: position.x - 100 }]}>
          <View style={styles.picker}>
            {COMMON_REACTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.reactionOption}
                onPress={() => handleReactionSelect(emoji)}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.pickerArrow} />
        </View>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  pickerContainer: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    padding: 8,
  },
  picker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 200,
  },
  reactionOption: {
    padding: 8,
    borderRadius: 16,
    margin: 2,
  },
  reactionEmoji: {
    fontSize: 20,
  },
  pickerArrow: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'white',
  },
})