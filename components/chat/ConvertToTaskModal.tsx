// components/chat/ConvertToTaskModal.tsx
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Message } from '../../types/chat'
import { convertMessageToTask, TaskFromMessage } from '../../services/taskConversionService'
import { Profile } from '../../types/chat'

interface ConvertToTaskModalProps {
  visible: boolean
  message: Message | null
  currentUserId: string
  channelMembers: Map<string, Profile>
  onClose: () => void
  onSuccess?: () => void
}

export const ConvertToTaskModal: React.FC<ConvertToTaskModalProps> = ({
  visible,
  message,
  currentUserId,
  channelMembers,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState<string>(currentUserId)
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [dueDate, setDueDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showAssigneePicker, setShowAssigneePicker] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (message && visible) {
      // Pre-fill form with message content
      setTitle(message.content.length > 50 ? message.content.substring(0, 50) + '...' : message.content)
      setDescription(message.content)
      setAssignedTo(currentUserId)
      setPriority('medium')
      setDueDate(null)
    }
  }, [message, visible, currentUserId])

  const handleConvert = async () => {
    if (!message || !title.trim()) {
      Alert.alert('Error', 'Please provide a task title')
      return
    }

    setLoading(true)
    try {
      const taskData: Partial<TaskFromMessage> = {
        title: title.trim(),
        description: description.trim() || title.trim(),
        assigned_to: assignedTo,
        priority,
        due_date: dueDate ? dueDate.toISOString().split('T')[0] : undefined,
      }

      await convertMessageToTask(message, currentUserId, taskData)
      
      Alert.alert('Success', 'Message converted to task successfully!', [
        { text: 'OK', onPress: () => {
          onClose()
          if (onSuccess) onSuccess()
        }}
      ])
    } catch (error) {
      console.error('Error converting to task:', error)
      Alert.alert('Error', 'Failed to convert message to task. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getAssigneeName = () => {
    if (assignedTo === currentUserId) return 'Assign to me'
    const member = channelMembers.get(assignedTo)
    return member ? member.full_name || member.username : 'Select assignee'
  }

  const membersList = Array.from(channelMembers.values())

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Convert to Task</Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.section}>
            <Text style={styles.label}>Task Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter task title"
              maxLength={200}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter task description"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Assign To</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowAssigneePicker(true)}
            >
              <Text style={styles.pickerText}>{getAssigneeName()}</Text>
              <Ionicons name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityContainer}>
              {(['low', 'medium', 'high'] as const).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityButton,
                    priority === p && styles.priorityButtonActive,
                    p === 'low' && priority === 'low' && styles.priorityLow,
                    p === 'medium' && priority === 'medium' && styles.priorityMedium,
                    p === 'high' && priority === 'high' && styles.priorityHigh,
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      priority === p && styles.priorityTextActive,
                    ]}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Due Date (Optional)</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#64748b" />
              <Text style={styles.pickerText}>
                {dueDate ? dueDate.toLocaleDateString() : 'No due date'}
              </Text>
              {dueDate && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation()
                    setDueDate(null)
                  }}
                  style={styles.clearDateButton}
                >
                  <Ionicons name="close-circle" size={18} color="#64748b" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.convertButton, loading && styles.convertButtonDisabled]}
            onPress={handleConvert}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.convertButtonText}>Convert to Task</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Assignee Picker Modal */}
        <Modal
          visible={showAssigneePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAssigneePicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowAssigneePicker(false)}
          >
            <View style={styles.pickerModal}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select Assignee</Text>
                <TouchableOpacity onPress={() => setShowAssigneePicker(false)}>
                  <Ionicons name="close" size={24} color="#1e293b" />
                </TouchableOpacity>
              </View>
              <ScrollView>
                <TouchableOpacity
                  style={styles.pickerOption}
                  onPress={() => {
                    setAssignedTo(currentUserId)
                    setShowAssigneePicker(false)
                  }}
                >
                  <Text style={styles.pickerOptionText}>Assign to me</Text>
                  {assignedTo === currentUserId && (
                    <Ionicons name="checkmark" size={20} color="#6366F1" />
                  )}
                </TouchableOpacity>
                {membersList.map(member => (
                  <TouchableOpacity
                    key={member.id}
                    style={styles.pickerOption}
                    onPress={() => {
                      setAssignedTo(member.id!)
                      setShowAssigneePicker(false)
                    }}
                  >
                    <Text style={styles.pickerOptionText}>
                      {member.full_name || member.username}
                    </Text>
                    {assignedTo === member.id && (
                      <Ionicons name="checkmark" size={20} color="#6366F1" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={dueDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios')
              if (selectedDate) {
                setDueDate(selectedDate)
              }
            }}
            minimumDate={new Date()}
          />
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8fafc',
    gap: 8,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  clearDateButton: {
    padding: 4,
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  priorityButtonActive: {
    borderWidth: 2,
  },
  priorityLow: {
    borderColor: '#10b981',
    backgroundColor: '#d1fae5',
  },
  priorityMedium: {
    borderColor: '#f59e0b',
    backgroundColor: '#fef3c7',
  },
  priorityHigh: {
    borderColor: '#ef4444',
    backgroundColor: '#fee2e2',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  priorityTextActive: {
    color: '#1e293b',
    fontWeight: '600',
  },
  convertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  convertButtonDisabled: {
    opacity: 0.6,
  },
  convertButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#1e293b',
  },
})

