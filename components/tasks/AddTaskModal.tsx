// components/tasks/AddTaskModal.tsx
import React from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { NewTaskForm, User, TaskLabel, SelectedFile, TaskPriority } from '../../types/tasks'
import { formatModalDate, formatFileSize } from '../../utils/taskHelpers'

interface AddTaskModalProps {
  visible: boolean
  newTask: NewTaskForm
  users: User[]
  labels: TaskLabel[]
  showUserSelector: boolean
  showDatePicker: boolean
  adding: boolean
  uploading: boolean
  onClose: () => void
  onFieldChange: (field: keyof NewTaskForm, value: any) => void
  onUserSelectorToggle: () => void
  onDatePickerToggle: () => void
  onLabelToggle: (labelId: string) => void
  onFileAdd: () => void
  onFileRemove: (index: number) => void
  onSubmit: () => void
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  visible,
  newTask,
  users,
  labels,
  showUserSelector,
  showDatePicker,
  adding,
  uploading,
  onClose,
  onFieldChange,
  onUserSelectorToggle,
  onDatePickerToggle,
  onLabelToggle,
  onFileAdd,
  onFileRemove,
  onSubmit
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add New Task</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView>
          <TextInput
            style={styles.input}
            placeholder="Task title *"
            value={newTask.title}
            onChangeText={(text) => onFieldChange('title', text)}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description (optional)"
            value={newTask.description}
            onChangeText={(text) => onFieldChange('description', text)}
            multiline
            numberOfLines={3}
          />

          {/* User Selector */}
          <Text style={styles.label}>Assign to</Text>
          <TouchableOpacity 
            style={styles.selectorButton}
            onPress={onUserSelectorToggle}
          >
            <Text style={[
              styles.selectorButtonText,
              newTask.assigned_to && styles.selectorButtonTextSelected
            ]}>
              {newTask.assigned_to_name}
            </Text>
          </TouchableOpacity>

          {/* Date Selector */}
          <Text style={styles.label}>Due Date</Text>
          <TouchableOpacity 
            style={styles.selectorButton}
            onPress={onDatePickerToggle}
          >
            <Text style={styles.selectorButtonText}>
              {formatModalDate(newTask.due_date)}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={newTask.due_date}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(event, date) => {
                onDatePickerToggle()
                if (date) {
                  onFieldChange('due_date', date)
                }
              }}
            />
          )}

          {/* Priority Selector */}
          <Text style={styles.label}>Priority</Text>
          <View style={styles.priorityButtons}>
            {(['low', 'medium', 'high'] as TaskPriority[]).map(priority => (
              <TouchableOpacity
                key={priority}
                style={[
                  styles.priorityButton,
                  newTask.priority === priority && styles.priorityButtonActive
                ]}
                onPress={() => onFieldChange('priority', priority)}
              >
                <Text style={[
                  styles.priorityButtonText,
                  newTask.priority === priority && styles.priorityButtonTextActive
                ]}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Labels Selector */}
          <Text style={styles.label}>Labels</Text>
          <View style={styles.labelsSelectContainer}>
            {labels.map((label) => {
              const isSelected = newTask.labels.includes(label.id)
              return (
                <TouchableOpacity
                  key={label.id}
                  style={[
                    styles.labelSelectChip,
                    isSelected && { backgroundColor: label.color + '30', borderColor: label.color }
                  ]}
                  onPress={() => onLabelToggle(label.id)}
                >
                  <Text style={[
                    styles.labelSelectChipText,
                    isSelected && { color: label.color, fontWeight: '600' }
                  ]}>
                    {label.name}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* File Attachments */}
          <Text style={styles.label}>Attachments</Text>
          <TouchableOpacity 
            style={styles.attachFileButton}
            onPress={onFileAdd}
          >
            <Text style={styles.attachFileButtonText}>📎 Attach File</Text>
          </TouchableOpacity>

          {newTask.attachments.length > 0 && (
            <View style={styles.selectedFilesContainer}>
              {newTask.attachments.map((file, index) => (
                <View key={index} style={styles.selectedFileItem}>
                  <View style={styles.selectedFileInfo}>
                    <Text style={styles.selectedFileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={styles.selectedFileSize}>
                      {formatFileSize(file.size)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeFileButton}
                    onPress={() => onFileRemove(index)}
                  >
                    <Text style={styles.removeFileText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity 
            style={[
              styles.createButton,
              (!newTask.title.trim() || adding || uploading) && styles.createButtonDisabled
            ]} 
            onPress={onSubmit}
            disabled={!newTask.title.trim() || adding || uploading}
          >
            {adding || uploading ? (
              <View style={styles.loadingButtonContent}>
                <ActivityIndicator color="white" />
                <Text style={styles.createButtonText}>
                  {uploading ? 'Uploading files...' : 'Creating...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.createButtonText}>Create Task</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* User Selector Modal */}
      {showUserSelector && (
        <UserSelectorModal
          visible={showUserSelector}
          users={users}
          selectedUserId={newTask.assigned_to}
          onClose={onUserSelectorToggle}
          onSelect={(user) => {
            onFieldChange('assigned_to', user.id)
            onFieldChange('assigned_to_name', user.full_name || user.username)
            onUserSelectorToggle()
          }}
        />
      )}
    </Modal>
  )
}

// User Selector Sub-Modal
interface UserSelectorModalProps {
  visible: boolean
  users: User[]
  selectedUserId: string
  onClose: () => void
  onSelect: (user: User) => void
}

const UserSelectorModal: React.FC<UserSelectorModalProps> = ({
  visible,
  users,
  selectedUserId,
  onClose,
  onSelect
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
          <Text style={styles.modalTitle}>Select User</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView>
          {users.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={styles.userItem}
              onPress={() => onSelect(user)}
            >
              <Text style={styles.userItemText}>
                {user.full_name || user.username}
              </Text>
              {selectedUserId === user.id && (
                <Text style={styles.selectedIndicator}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
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
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    marginHorizontal: 20,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginHorizontal: 20,
  },
  selectorButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    marginHorizontal: 20,
    backgroundColor: '#F9FAFB',
  },
  selectorButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
  selectorButtonTextSelected: {
    color: '#1F2937',
    fontWeight: '500',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    marginHorizontal: 20,
  },
  priorityButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  priorityButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  priorityButtonTextActive: {
    color: 'white',
  },
  labelsSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
    marginHorizontal: 20,
  },
  labelSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  labelSelectChipText: {
    fontSize: 13,
    color: '#6B7280',
  },
  attachFileButton: {
    borderWidth: 2,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    marginHorizontal: 20,
    backgroundColor: '#EEF2FF',
  },
  attachFileButtonText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedFilesContainer: {
    marginBottom: 16,
    marginHorizontal: 20,
  },
  selectedFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedFileInfo: {
    flex: 1,
    marginRight: 8,
  },
  selectedFileName: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    marginBottom: 2,
  },
  selectedFileSize: {
    fontSize: 12,
    color: '#6B7280',
  },
  removeFileButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeFileText: {
    color: '#EF4444',
    fontSize: 20,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#6366F1',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  createButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  userItemText: {
    fontSize: 16,
    color: '#1F2937',
  },
  selectedIndicator: {
    fontSize: 16,
    color: '#6366F1',
    fontWeight: 'bold',
  },
})