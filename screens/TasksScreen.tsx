// screens/TasksScreen.tsx
import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  Modal,
  ActivityIndicator,
  Linking,
  Platform
} from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as DocumentPicker from 'expo-document-picker'



interface Task {
  id: string
  title: string
  description: string
  assigned_to: string
  assigned_to_profile?: {
    username: string
    full_name: string
  }
  created_by: string
  due_date: string
  status: 'todo' | 'in-progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  created_at: string
}

interface User {
  id: string
  username: string
  full_name: string
}

interface TaskAttachment {
  id: string
  task_id: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  uploaded_by: string
  created_at: string
}

interface SelectedFile {
  uri: string
  name: string
  size: number
  mimeType: string
}

export default function TasksScreen() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [attachments, setAttachments] = useState<Record<string, TaskAttachment[]>>({})
  const [loading, setLoading] = useState(true)
  const [addingTask, setAddingTask] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showUserSelector, setShowUserSelector] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedTaskForAttachment, setSelectedTaskForAttachment] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'todo' | 'in-progress' | 'done'>('all')

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: '',
    assigned_to_name: 'Select user...',
    due_date: new Date(),
    priority: 'medium' as 'low' | 'medium' | 'high',
    attachments: [] as SelectedFile[]
  })

  useEffect(() => {
    if (user) {
      fetchTasks()
      fetchUsers()
      setupRealtimeSubscription()
    }
  }, [user])

  useEffect(() => {
    // Fetch attachments for all tasks
    if (tasks.length > 0) {
      tasks.forEach(task => {
        fetchAttachments(task.id)
      })
    }
  }, [tasks])

  const fetchTasks = async () => {
    if (!user) return

    try {
      setLoading(true)
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assigned_to_profile:assigned_to (username, full_name),
          created_by_profile:created_by (username, full_name)
        `)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error

      setTasks(data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
      Alert.alert('Error', 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .order('full_name')

      if (error) throw error

      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchAttachments = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setAttachments(prev => ({
        ...prev,
        [taskId]: data || []
      }))
    } catch (error) {
      console.error('Error fetching attachments:', error)
    }
  }

  const setupRealtimeSubscription = () => {
    if (!user) return

    const tasksSubscription = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        () => {
          fetchTasks()
        }
      )
      .subscribe()

    const attachmentsSubscription = supabase
      .channel('attachments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_attachments'
        },
        (payload) => {
          if (payload.new && 'task_id' in payload.new) {
            fetchAttachments(payload.new.task_id as string)
          }
        }
      )
      .subscribe()

    return () => {
      tasksSubscription.unsubscribe()
      attachmentsSubscription.unsubscribe()
    }
  }

const pickDocument = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false
    })

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const file = result.assets[0]
      
      // Check file size (max 10MB)
      if (file.size && file.size > 10 * 1024 * 1024) {
        Alert.alert('Error', 'File size must be less than 10MB')
        return
      }

      const selectedFile: SelectedFile = {
        uri: file.uri,
        name: file.name,
        size: file.size || 0,
        mimeType: file.mimeType || 'application/octet-stream'
      }

      setNewTask(prev => ({
        ...prev,
        attachments: [...prev.attachments, selectedFile]
      }))
      
      console.log('File selected:', selectedFile.name, 'Size:', selectedFile.size)
    }
  } catch (error) {
    console.error('Error picking document:', error)
    Alert.alert('Error', 'Failed to pick document')
  }
}

  const removeAttachment = (index: number) => {
    setNewTask(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }))
  }



const uploadFile = async (file: SelectedFile, taskId: string) => {
  try {
    if (!user) {
      throw new Error('No user found')
    }

    console.log('Starting file upload:', file.name)

    // Use fetch to get the file as arrayBuffer (same as ProfileScreen)
    const response = await fetch(file.uri)
    if (!response.ok) {
      throw new Error('Failed to read selected file')
    }

    const arrayBuffer = response.arrayBuffer
      ? await response.arrayBuffer()
      : null

    if (!arrayBuffer) {
      throw new Error('Unable to process selected file')
    }

    console.log('File converted to arrayBuffer, size:', arrayBuffer.byteLength)

    // Generate unique file path
    const fileExt = file.name.split('.').pop() || 'file'
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `task-attachments/${taskId}/${fileName}`

    console.log('Uploading to path:', filePath)

    // Upload to Supabase Storage (same approach as ProfileScreen)
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, arrayBuffer, {
        contentType: file.mimeType || 'application/octet-stream',
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw uploadError
    }

    console.log('File uploaded successfully')

    // Save attachment record to database
    const { error: dbError } = await supabase
      .from('task_attachments')
      .insert({
        task_id: taskId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.mimeType || 'application/octet-stream',
        uploaded_by: user?.id
      })

    if (dbError) {
      console.error('Database error:', dbError)
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('attachment').remove([filePath])
      throw dbError
    }

    console.log('Database record saved successfully')
    return true
  } catch (error) {
    console.error('Error uploading file:', error)
    throw error
  }
}

  const addTask = async () => {
    if (!newTask.title.trim() || !user) return

    try {
      setAddingTask(true)

      const taskData = {
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        assigned_to: newTask.assigned_to || user.id,
        created_by: user.id,
        due_date: newTask.due_date.toISOString().split('T')[0],
        priority: newTask.priority,
        status: 'todo' as const
      }

      const { data: taskResponse, error: taskError } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single()

      if (taskError) throw taskError

      // Upload attachments if any
      if (newTask.attachments.length > 0) {
        setUploadingFile(true)
        for (const file of newTask.attachments) {
          await uploadFile(file, taskResponse.id)
        }
        setUploadingFile(false)
      }

      // Reset form and close modal
      setNewTask({
        title: '',
        description: '',
        assigned_to: '',
        assigned_to_name: 'Select user...',
        due_date: new Date(),
        priority: 'medium',
        attachments: []
      })
      setShowAddModal(false)
      Alert.alert('Success', 'Task created successfully!')
    } catch (error) {
      console.error('Error creating task:', error)
      Alert.alert('Error', 'Failed to create task')
    } finally {
      setAddingTask(false)
      setUploadingFile(false)
    }
  }

const addAttachmentToExistingTask = async (taskId: string) => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false
    })

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const file = result.assets[0]
      
      if (file.size && file.size > 10 * 1024 * 1024) {
        Alert.alert('Error', 'File size must be less than 10MB')
        return
      }

      setUploadingFile(true)

      const selectedFile: SelectedFile = {
        uri: file.uri,
        name: file.name,
        size: file.size || 0,
        mimeType: file.mimeType || 'application/octet-stream'
      }

      await uploadFile(selectedFile, taskId)
      await fetchAttachments(taskId)
      
      Alert.alert('Success', 'File uploaded successfully!')
    }
  } catch (error) {
    console.error('Error adding attachment:', error)
    Alert.alert('Error', 'Failed to upload file')
  } finally {
    setUploadingFile(false)
  }
}

  const downloadAttachment = async (attachment: TaskAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .createSignedUrl(attachment.file_path, 3600) // 1 hour expiry

      if (error) throw error

      if (data?.signedUrl) {
        await Linking.openURL(data.signedUrl)
      }
    } catch (error) {
      console.error('Error downloading attachment:', error)
      Alert.alert('Error', 'Failed to download file')
    }
  }

  const deleteAttachment = async (attachmentId: string, filePath: string, taskId: string) => {
    Alert.alert(
      'Delete Attachment',
      'Are you sure you want to delete this file?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from storage
              const { error: storageError } = await supabase.storage
                .from('attachments')
                .remove([filePath])

              if (storageError) throw storageError

              // Delete from database
              const { error: dbError } = await supabase
                .from('task_attachments')
                .delete()
                .eq('id', attachmentId)

              if (dbError) throw dbError

              await fetchAttachments(taskId)
              Alert.alert('Success', 'File deleted successfully!')
            } catch (error) {
              console.error('Error deleting attachment:', error)
              Alert.alert('Error', 'Failed to delete file')
            }
          }
        }
      ]
    )
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)

      if (error) throw error

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ))
    } catch (error) {
      console.error('Error updating task status:', error)
      Alert.alert('Error', 'Failed to update task status')
      fetchTasks()
    }
  }

  const deleteTask = async (taskId: string) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task? All attachments will also be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all attachments from storage
              const taskAttachments = attachments[taskId] || []
              if (taskAttachments.length > 0) {
                const filePaths = taskAttachments.map(a => a.file_path)
                await supabase.storage
                  .from('attachments')
                  .remove(filePaths)
              }

              const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId)

              if (error) throw error

              setTasks(prev => prev.filter(task => task.id !== taskId))
            } catch (error) {
              console.error('Error deleting task:', error)
              Alert.alert('Error', 'Failed to delete task')
            }
          }
        }
      ]
    )
  }

  const selectUser = (selectedUser: User) => {
    setNewTask(prev => ({
      ...prev,
      assigned_to: selectedUser.id,
      assigned_to_name: selectedUser.full_name || selectedUser.username
    }))
    setShowUserSelector(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return '#EF4444'
      case 'in-progress': return '#F59E0B'
      case 'done': return '#10B981'
      default: return '#6B7280'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#EF4444'
      case 'medium': return '#F59E0B'
      case 'low': return '#10B981'
      default: return '#6B7280'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatModalDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString()
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true
        return task.status === filter
  })

  if (loading && tasks.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading tasks...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <Text style={styles.subtitle}>Manage your team's tasks</Text>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {(['all', 'todo', 'in-progress', 'done'] as const).map(status => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              filter === status && styles.filterButtonActive
            ]}
            onPress={() => setFilter(status)}
          >
            <Text style={[
              styles.filterButtonText,
              filter === status && styles.filterButtonTextActive
            ]}>
              {status === 'all' ? 'All' : status.replace('-', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Add Task Button */}
      <TouchableOpacity 
        style={styles.addTaskButton}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.addTaskButtonText}>+ Add New Task</Text>
      </TouchableOpacity>

      {/* Tasks List */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        style={styles.taskList}
        refreshing={loading}
        onRefresh={fetchTasks}
        renderItem={({ item }) => (
          <View style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <View style={styles.taskTitleContainer}>
                <Text style={styles.taskTitle}>{item.title}</Text>
                <View style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor(item.priority) }
                ]}>
                  <Text style={styles.priorityText}>
                    {item.priority.toUpperCase()}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}
                onPress={() => {
                  const statuses: Task['status'][] = ['todo', 'in-progress', 'done']
                  const currentIndex = statuses.indexOf(item.status)
                  const nextStatus = statuses[(currentIndex + 1) % statuses.length]
                  updateTaskStatus(item.id, nextStatus)
                }}
              >
                <Text style={styles.statusText}>
                  {item.status.replace('-', ' ').toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>

            {item.description ? (
              <Text style={styles.taskDescription}>{item.description}</Text>
            ) : null}

            {/* Attachments Section */}
            {attachments[item.id] && attachments[item.id].length > 0 && (
              <View style={styles.attachmentsContainer}>
                <Text style={styles.attachmentsTitle}>
                  📎 Attachments ({attachments[item.id].length})
                </Text>
                {attachments[item.id].map((attachment) => (
                  <View key={attachment.id} style={styles.attachmentItem}>
                    <TouchableOpacity
                      style={styles.attachmentInfo}
                      onPress={() => downloadAttachment(attachment)}
                    >
                      <Text style={styles.attachmentName} numberOfLines={1}>
                        {attachment.file_name}
                      </Text>
                      <Text style={styles.attachmentSize}>
                        {formatFileSize(attachment.file_size)}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteAttachmentButton}
                      onPress={() => deleteAttachment(attachment.id, attachment.file_path, item.id)}
                    >
                      <Text style={styles.deleteAttachmentText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.taskFooter}>
              <View style={styles.taskMeta}>
                <Text style={styles.assignedTo}>
                  Assigned to: {item.assigned_to_profile?.full_name || item.assigned_to_profile?.username || 'Unassigned'}
                </Text>
                <Text style={[
                  styles.dueDate,
                  isOverdue(item.due_date) && styles.overdueDate
                ]}>
                  Due: {formatDate(item.due_date)}
                  {isOverdue(item.due_date) && ' ⚠️'}
                </Text>
              </View>
              
              <View style={styles.taskActions}>
                <TouchableOpacity
                  style={styles.attachButton}
                  onPress={() => addAttachmentToExistingTask(item.id)}
                  disabled={uploadingFile}
                >
                  {uploadingFile ? (
                    <ActivityIndicator size="small" color="#6366F1" />
                  ) : (
                    <Text style={styles.attachButtonText}>📎 Add</Text>
                  )}
                </TouchableOpacity>
                
                {(user?.id === item.created_by || user?.id === item.assigned_to) && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteTask(item.id)}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tasks found</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'all' 
                ? 'Create your first task to get started!'
                : `No ${filter.replace('-', ' ')} tasks`
              }
            </Text>
          </View>
        }
      />

      {/* Add Task Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Task</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.closeButton}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Task title *"
            value={newTask.title}
            onChangeText={(text) => setNewTask(prev => ({ ...prev, title: text }))}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description (optional)"
            value={newTask.description}
            onChangeText={(text) => setNewTask(prev => ({ ...prev, description: text }))}
            multiline
            numberOfLines={3}
          />

          {/* User Selector */}
          <Text style={styles.label}>Assign to</Text>
          <TouchableOpacity 
            style={styles.selectorButton}
            onPress={() => setShowUserSelector(true)}
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
            onPress={() => setShowDatePicker(true)}
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
              onChange={(event, date) => {
                setShowDatePicker(false)
                if (date) {
                  setNewTask(prev => ({ ...prev, due_date: date }))
                }
              }}
            />
          )}

          {/* Priority Selector */}
          <Text style={styles.label}>Priority</Text>
          <View style={styles.priorityButtons}>
            {(['low', 'medium', 'high'] as const).map(priority => (
              <TouchableOpacity
                key={priority}
                style={[
                  styles.priorityButton,
                  newTask.priority === priority && styles.priorityButtonActive
                ]}
                onPress={() => setNewTask(prev => ({ ...prev, priority }))}
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

          {/* File Attachments */}
          <Text style={styles.label}>Attachments</Text>
          <TouchableOpacity 
            style={styles.attachFileButton}
            onPress={pickDocument}
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
                    onPress={() => removeAttachment(index)}
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
              (!newTask.title.trim() || addingTask || uploadingFile) && styles.createButtonDisabled
            ]} 
            onPress={addTask}
            disabled={!newTask.title.trim() || addingTask || uploadingFile}
          >
            {addingTask || uploadingFile ? (
              <View style={styles.loadingButtonContent}>
                <ActivityIndicator color="white" />
                <Text style={styles.createButtonText}>
                  {uploadingFile ? 'Uploading files...' : 'Creating...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.createButtonText}>Create Task</Text>
            )}
          </TouchableOpacity>
        </View>
      </Modal>

      {/* User Selector Modal */}
      <Modal
        visible={showUserSelector}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowUserSelector(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select User</Text>
            <TouchableOpacity onPress={() => setShowUserSelector(false)}>
              <Text style={styles.closeButton}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.userItem}
                onPress={() => selectUser(item)}
              >
                <Text style={styles.userItemText}>
                  {item.full_name || item.username}
                </Text>
                {newTask.assigned_to === item.id && (
                  <Text style={styles.selectedIndicator}>✓</Text>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No users found</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#6366F1',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  addTaskButton: {
    backgroundColor: '#6366F1',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addTaskButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  taskList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  taskCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  taskDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  attachmentsContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  attachmentsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  attachmentInfo: {
    flex: 1,
    marginRight: 8,
  },
  attachmentName: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
    marginBottom: 2,
  },
  attachmentSize: {
    fontSize: 11,
    color: '#6B7280',
  },
  deleteAttachmentButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAttachmentText: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '600',
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskMeta: {
    flex: 1,
  },
  assignedTo: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  dueDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  overdueDate: {
    color: '#EF4444',
    fontWeight: '600',
  },
  taskActions: {
    flexDirection: 'row',
    gap: 8,
  },
  attachButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  attachButtonText: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EF4444',
    borderRadius: 6,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 60,
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
  },
  selectorButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
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
  attachFileButton: {
    borderWidth: 2,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#EEF2FF',
  },
  attachFileButtonText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedFilesContainer: {
    marginBottom: 16,
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