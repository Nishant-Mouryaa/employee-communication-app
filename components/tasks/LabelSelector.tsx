// components/tasks/LabelSelector.tsx
import React from 'react'
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { TaskLabel } from '../../types/tasks'
import { Platform } from 'react-native'

interface LabelSelectorProps {
  visible: boolean
  labels: TaskLabel[]
  selectedLabelIds: string[]
  onClose: () => void
  onToggle: (labelId: string) => void
  loading?: boolean // Add loading prop
}

export const LabelSelector: React.FC<LabelSelectorProps> = ({
  visible,
  labels,
  selectedLabelIds,
  onClose,
  onToggle,
  loading = false
}) => {
  // Generate fallback color if color is invalid
  const getLabelColor = (color: string) => {
    // Check if color is a valid hex color
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    if (hexColorRegex.test(color)) {
      return color
    }
    // Return a default color if invalid
    return '#6366F1'
  }

  if (loading) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading labels...</Text>
        </View>
      </Modal>
    )
  }

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
          <TouchableOpacity onPress={onClose} style={styles.closeButtonContainer}>
            <Text style={styles.closeButton}>Done</Text>
          </TouchableOpacity>
        </View>

        {labels.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏷️</Text>
            <Text style={styles.emptyTitle}>No Labels</Text>
            <Text style={styles.emptyText}>
              Create labels first to assign them to tasks
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.labelSelectorContent} showsVerticalScrollIndicator={false}>
            {labels.map((label) => {
              const isSelected = selectedLabelIds.includes(label.id)
              const labelColor = getLabelColor(label.color || '#6366F1')
              
              return (
                <TouchableOpacity
                  key={label.id}
                  style={[
                    styles.labelSelectorItem,
                    isSelected && styles.labelSelectorItemSelected,
                    isSelected && { borderColor: labelColor }
                  ]}
                  onPress={() => onToggle(label.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.labelLeftContent}>
                    <View
                      style={[
                        styles.labelSelectorColor,
                        { backgroundColor: labelColor }
                      ]}
                    />
                    <Text style={styles.labelSelectorName}>{label.name || 'Unnamed Label'}</Text>
                  </View>
                  {isSelected && (
                    <View style={[styles.checkmarkContainer, { backgroundColor: labelColor }]}>
                      <Text style={styles.labelSelectorCheck}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        )}
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
    paddingTop: Platform.OS === 'ios' ? 60 : 20, // Adjust for iOS safe area
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButtonContainer: {
    padding: 8,
    marginRight: -8, // Increase touch area
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
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  labelSelectorItemSelected: {
    backgroundColor: '#EEF2FF',
  },
  labelLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  labelSelectorColor: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  labelSelectorName: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  labelSelectorCheck: {
    fontSize: 14,
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
})