// components/announcements/CreateAnnouncementModal.tsx
import React, { useState } from 'react'
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet
} from 'react-native'
import { Category, UserRole } from '../../types/announcement'

interface CreateAnnouncementModalProps {
  visible: boolean
  isEditing: boolean
  categories: Category[]
  userRole: UserRole
  initialData?: {
    title: string
    content: string
    isImportant: boolean
    isPinned: boolean
    category_id: string
  }
  loading: boolean
  onClose: () => void
  onSubmit: (data: any) => void
}

export const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({
  visible,
  isEditing,
  categories,
  userRole,
  initialData,
  loading,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState(initialData || {
    title: '',
    content: '',
    isImportant: false,
    isPinned: false,
    category_id: ''
  })

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    onSubmit(formData)
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {isEditing ? 'Edit Announcement' : 'New Announcement'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter announcement title"
              value={formData.title}
              onChangeText={(text) => updateField('title', text)}
              editable={!loading}
              maxLength={100}
            />
            <Text style={styles.charCount}>
              {formData.title.length}/100
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Content *</Text>
            <TextInput
              style={[styles.input, styles.contentInput]}
              placeholder="Write your announcement here..."
              value={formData.content}
              onChangeText={(text) => updateField('content', text)}
              multiline
              numberOfLines={6}
              editable={!loading}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.charCount}>
              {formData.content.length}/1000
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categorySelection}
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryOption,
                    formData.category_id === category.id && styles.categoryOptionActive,
                    { borderColor: category.color }
                  ]}
                  onPress={() => updateField('category_id', 
                    formData.category_id === category.id ? '' : category.id
                  )}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text style={[
                    styles.categoryText,
                    formData.category_id === category.id && styles.categoryTextActive
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.toggleGroup}>
            <TouchableOpacity
              style={styles.toggleItem}
              onPress={() => updateField('isImportant', !formData.isImportant)}
              disabled={loading}
            >
              <View style={[
                styles.toggleCheckbox,
                formData.isImportant && styles.toggleCheckboxActive
              ]}>
                {formData.isImportant && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleLabel}>Mark as important</Text>
                <Text style={styles.toggleDescription}>Highlight this announcement for everyone</Text>
              </View>
              <Text style={styles.toggleIcon}>⭐</Text>
            </TouchableOpacity>

            {userRole.canPin && (
              <TouchableOpacity
                style={styles.toggleItem}
                onPress={() => updateField('isPinned', !formData.isPinned)}
                disabled={loading}
              >
                <View style={[
                  styles.toggleCheckbox,
                  formData.isPinned && styles.toggleCheckboxActive
                ]}>
                  {formData.isPinned && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={styles.toggleContent}>
                  <Text style={styles.toggleLabel}>Pin to top</Text>
                  <Text style={styles.toggleDescription}>Keep this announcement at the top</Text>
                </View>
                <Text style={styles.toggleIcon}>📌</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.cancelButton, loading && styles.buttonDisabled]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.submitButton,
                (!formData.title.trim() || !formData.content.trim() || loading) && styles.buttonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!formData.title.trim() || !formData.content.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isEditing ? 'Update' : 'Post'} Announcement
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#1e293b',
  },
  contentInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 4,
  },
  categorySelection: {
    flexDirection: 'row',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
  },
  categoryOptionActive: {
    backgroundColor: '#007AFF10',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  categoryTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  toggleGroup: {
    marginBottom: 30,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toggleCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleCheckboxActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  toggleContent: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: 12,
    color: '#64748b',
  },
  toggleIcon: {
    fontSize: 20,
    marginLeft: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  submitButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
})