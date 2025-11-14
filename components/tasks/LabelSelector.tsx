// components/tasks/LabelSelector.tsx
import React from 'react'
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { TaskLabel } from '../../types/tasks'

interface LabelSelectorProps {
  visible: boolean
  labels: TaskLabel[]
  selectedLabelIds: string[]
  onClose: () => void
  onToggle: (labelId: string) => void
}

export const LabelSelector: React.FC<LabelSelectorProps> = ({
  visible,
  labels,
  selectedLabelIds,
  onClose,
  onToggle
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Manage Labels</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.labelSelectorContent}>
          {labels.map((label) => {
            const isSelected = selectedLabelIds.includes(label.id)
            return (
              <TouchableOpacity
                key={label.id}
                style={[
                  styles.labelSelectorItem,
                  isSelected && styles.labelSelectorItemSelected
                ]}
                onPress={() => onToggle(label.id)}
              >
                <View
                  style={[styles.labelSelectorColor, { backgroundColor: label.color }]}
                />
                <Text style={styles.labelSelectorName}>{label.name}</Text>
                {isSelected && (
                  <Text style={styles.labelSelectorCheck}>✓</Text>
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    fontSize: 16,
    color: '#6366F1',
    fontWeight: '600',
  },
  labelSelectorContent: {
    flex: 1,
    padding: 20,
  },
  labelSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  labelSelectorItemSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  labelSelectorColor: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  labelSelectorName: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  labelSelectorCheck: {
    fontSize: 18,
    color: '#6366F1',
    fontWeight: 'bold',
  },
})