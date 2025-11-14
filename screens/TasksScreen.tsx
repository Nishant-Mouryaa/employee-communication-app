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
  Platform,
  ScrollView,
  KeyboardAvoidingView
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

interface TaskComment {
  id: string
  task_id: string
  user_id: string
  comment: string
  created_at: string
  user_profile?: {
    username: string
    full_name: string
    avatar_url: string
  }
}

interface TaskLabel {
  id: string
  name: string
  color: string
}

interface TaskWithLabels extends Task {
  labels?: TaskLabel[]
}

export default function TasksScreen() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<TaskWithLabels[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [attachments, setAttachments] = useState<Record<string, TaskAttachment[]>>({})
  const [comments, setComments] = useState<Record<string, TaskComment[]>>({})
  const [allLabels, setAllLabels] = useState<TaskLabel[]>([])
  const [loading, setLoading] = useState(true)
  const [addingTask, setAddingTask] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showUserSelector, setShowUserSelector] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTaskDetails, setShowTaskDetails] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskWithLabels | null>(null)
  const [newComment, setNewComment] = useState('')
  const [addingComment, setAddingComment] = useState(false)
  const [showLabelSelector, setShowLabelSelector] = useState(false)
  const [filter, setFilter] = useState<'all' | 'todo' | 'in-progress' | 'done'>('all')
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: '',
    assigned_to_name: 'Select user...',
    due_date: new Date(),
    priority: 'medium' as 'low' | 'medium' | 'high',
    attachments: [] as SelectedFile[],
    labels: [] as string[]
  })

  useEffect(() => {
    if (user) {
      fetchTasks()
      fetchUsers()
      fetchLabels()
      setupRealtimeSubscription()
    }
  }, [user])

  useEffect(() => {
    if (tasks.length > 0) {
      tasks.forEach(task => {
        fetchAttachments(task.id)
        fetchComments(task.id)
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

      // Fetch labels for each task
      const tasksWithLabels = await Promise.all(
        (data || []).map(async (task) => {
          const { data: labelData } = await supabase
            .from('task_label_assignments')
            .select(`
              label_id,
              task_labels:label_id (id, name, color)
            `)
            .eq('task_id', task.id)

          const labels = labelData?.map(l => l.task_labels).filter(Boolean) || []
          return { ...task, labels }
        })
      )

      setTasks(tasksWithLabels)
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

const fetchComments = async (taskId: string) => {
  try {
    // Fetch comments first
    const { data: commentsData, error: commentsError } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    if (commentsError) throw commentsError

    if (!commentsData || commentsData.length === 0) {
      setComments(prev => ({
        ...prev,
        [taskId]: []
      }))
      return
    }

    // Get unique user IDs
    const userIds = [...new Set(commentsData.map(c => c.user_id))]
    
    // Fetch user profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      // Still set comments even if profiles fail
      setComments(prev => ({
        ...prev,
        [taskId]: commentsData
      }))
      return
    }

    // Create a map of user profiles
    const profilesMap = new Map(
      profilesData?.map(profile => [profile.id, profile]) || []
    )

    // Merge comments with profiles
    const commentsWithProfiles = commentsData.map(comment => ({
      ...comment,
      user_profile: profilesMap.get(comment.user_id) || {
        username: 'Unknown',
        full_name: 'Unknown User',
        avatar_url: null
      }
    }))

    setComments(prev => ({
      ...prev,
      [taskId]: commentsWithProfiles
    }))
  } catch (error) {
    console.error('Error fetching comments:', error)
    setComments(prev => ({
      ...prev,
      [taskId]: []
    }))
  }
}

  const fetchLabels = async () => {
    try {
      const { data, error } = await supabase
        .from('task_labels')
        .select('*')
        .order('name')

      if (error) throw error

      setAllLabels(data || [])
    } catch (error) {
      console.error('Error fetching labels:', error)
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

    const commentsSubscription = supabase
      .channel('comments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments'
        },
        (payload) => {
          if (payload.new && 'task_id' in payload.new) {
            fetchComments(payload.new.task_id as string)
          }
        }
      )
      .subscribe()

    return () => {
      tasksSubscription.unsubscribe()
      attachmentsSubscription.unsubscribe()
      commentsSubscription.unsubscribe()
    }
  }

  const addComment = async () => {
    if (!newComment.trim() || !selectedTask || !user) return

    try {
      setAddingComment(true)

      const { error } = await supabase
        .from('task_comments')
        .insert({
          task_id: selectedTask.id,
          user_id: user.id,
          comment: newComment.trim()
        })

      if (error) throw error

      setNewComment('')
      await fetchComments(selectedTask.id)
    } catch (error) {
      console.error('Error adding comment:', error)
      Alert.alert('Error', 'Failed to add comment')
    } finally {
      setAddingComment(false)
    }
  }

  const deleteComment = async (commentId: string, taskId: string) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('task_comments')
                .delete()
                .eq('id', commentId)

              if (error) throw error

              await fetchComments(taskId)
            } catch (error) {
              console.error('Error deleting comment:', error)
              Alert.alert('Error', 'Failed to delete comment')
            }
          }
        }
      ]
    )
  }

  const toggleLabel = (labelId: string) => {
    setNewTask(prev => {
      const labels = prev.labels.includes(labelId)
        ? prev.labels.filter(id => id !== labelId)
        : [...prev.labels, labelId]
      return { ...prev, labels }
    })
  }

  const toggleTaskLabel = async (taskId: string, labelId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId)
      if (!task) return

      const hasLabel = task.labels?.some(l => l.id === labelId)

      if (hasLabel) {
        // Remove label
        const { error } = await supabase
          .from('task_label_assignments')
          .delete()
          .eq('task_id', taskId)
          .eq('label_id', labelId)

        if (error) throw error
      } else {
        // Add label
        const { error } = await supabase
          .from('task_label_assignments')
          .insert({
            task_id: taskId,
            label_id: labelId
          })

        if (error) throw error
      }

      await fetchTasks()
    } catch (error) {
      console.error('Error toggling label:', error)
      Alert.alert('Error', 'Failed to update label')
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

      const fileExt = file.name.split('.').pop() || 'file'
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `task-attachments/${taskId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, arrayBuffer, {
          contentType: file.mimeType || 'application/octet-stream',
          upsert: false
        })

      if (uploadError) throw uploadError

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
        await supabase.storage.from('attachments').remove([filePath])
        throw dbError
      }

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

      // Add labels
      if (newTask.labels.length > 0) {
        const labelAssignments = newTask.labels.map(labelId => ({
          task_id: taskResponse.id,
          label_id: labelId
        }))

        const { error: labelError } = await supabase
          .from('task_label_assignments')
          .insert(labelAssignments)

        if (labelError) console.error('Error adding labels:', labelError)
      }

      // Upload attachments
      if (newTask.attachments.length > 0) {
        setUploadingFile(true)
        for (const file of newTask.attachments) {
          await uploadFile(file, taskResponse.id)
        }
        setUploadingFile(false)
      }

      setNewTask({
        title: '',
        description: '',
        assigned_to: '',
        assigned_to_name: 'Select user...',
        due_date: new Date(),
        priority: 'medium',
        attachments: [],
        labels: []
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
        .createSignedUrl(attachment.file_path, 3600)

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
              const { error: storageError } = await supabase.storage
                .from('attachments')
                .remove([filePath])

              if (storageError) throw storageError

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
      'Are you sure you want to delete this task? All attachments and comments will also be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
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
              if (selectedTask?.id === taskId) {
                setShowTaskDetails(false)
                setSelectedTask(null)
              }
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

  const openTaskDetails = (task: TaskWithLabels) => {
    setSelectedTask(task)
    setShowTaskDetails(true)
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
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
          <TouchableOpacity 
            style={styles.taskCard}
            onPress={() => openTaskDetails(item)}
            activeOpacity={0.7}
          >
            <View style={styles.taskHeader}>
              <View style={styles.taskTitleContainer}>
                <Text style={styles.taskTitle}>{item.title}</Text>
                <View style={styles.badgesRow}>
                  <View style={[
                    styles.priorityBadge,
                    { backgroundColor: getPriorityColor(item.priority) }
                  ]}>
                    <Text style={styles.priorityText}>
                      {item.priority.toUpperCase()}
                    </Text>
                  </View>
                  {item.labels && item.labels.length > 0 && (
                    <View style={styles.labelsPreview}>
                      {item.labels.slice(0, 2).map((label) => (
                        <View
                          key={label.id}
                          style={[styles.labelChip, { backgroundColor: label.color + '20', borderColor: label.color }]}
                        >
                          <Text style={[styles.labelChipText, { color: label.color }]}>
                            {label.name}
                          </Text>
                        </View>
                      ))}
                      {item.labels.length > 2 && (
                        <Text style={styles.moreLabelIndicator}>
                          +{item.labels.length - 2}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}
                onPress={(e) => {
                  e.stopPropagation()
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
              <Text style={styles.taskDescription} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            <View style={styles.taskFooter}>
              <View style={styles.taskMeta}>
                <Text style={styles.assignedTo}>
                  👤 {item.assigned_to_profile?.full_name || item.assigned_to_profile?.username || 'Unassigned'}
                </Text>
                <Text style={[
                  styles.dueDate,
                  isOverdue(item.due_date) && styles.overdueDate
                ]}>
                  📅 {formatDate(item.due_date)}
                  {isOverdue(item.due_date) && ' ⚠️'}
                </Text>
              </View>
              
              <View style={styles.taskIcons}>
                {attachments[item.id] && attachments[item.id].length > 0 && (
                  <View style={styles.iconBadge}>
                    <Text style={styles.iconBadgeText}>
                      📎 {attachments[item.id].length}
                    </Text>
                  </View>
                )}
                {comments[item.id] && comments[item.id].length > 0 && (
                  <View style={styles.iconBadge}>
                    <Text style={styles.iconBadgeText}>
                      💬 {comments[item.id].length}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
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

      {/* Task Details Modal */}
      <Modal
        visible={showTaskDetails}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowTaskDetails(false)
          setSelectedTask(null)
        }}
      >
        {selectedTask && (
          <KeyboardAvoidingView 
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Task Details</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowTaskDetails(false)
                  setSelectedTask(null)
                }}
              >
                <Text style={styles.closeButton}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.detailsScrollView}>
              {/* Task Info */}
              <View style={styles.detailsSection}>
                <Text style={styles.detailsTitle}>{selectedTask.title}</Text>
                
                <View style={styles.detailsBadges}>
                  <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedTask.status) }]}>
                    <Text style={styles.statusTextLarge}>
                      {selectedTask.status.replace('-', ' ').toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.priorityBadgeLarge, { backgroundColor: getPriorityColor(selectedTask.priority) }]}>
                    <Text style={styles.priorityTextLarge}>
                      {selectedTask.priority.toUpperCase()} PRIORITY
                    </Text>
                  </View>
                </View>

                {selectedTask.description ? (
                  <Text style={styles.detailsDescription}>{selectedTask.description}</Text>
                ) : null}

                <View style={styles.detailsMetaContainer}>
                  <View style={styles.detailsMetaItem}>
                    <Text style={styles.detailsMetaLabel}>Assigned to:</Text>
                    <Text style={styles.detailsMetaValue}>
                      {selectedTask.assigned_to_profile?.full_name || 'Unassigned'}
                    </Text>
                  </View>
                  <View style={styles.detailsMetaItem}>
                    <Text style={styles.detailsMetaLabel}>Due Date:</Text>
                    <Text style={[
                      styles.detailsMetaValue,
                      isOverdue(selectedTask.due_date) && styles.overdueText
                    ]}>
                      {formatDate(selectedTask.due_date)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Labels Section */}
              <View style={styles.detailsSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>🏷️ Labels</Text>
                  <TouchableOpacity
                    style={styles.manageLabelButton}
                    onPress={() => setShowLabelSelector(true)}
                  >
                    <Text style={styles.manageLabelButtonText}>Manage</Text>
                  </TouchableOpacity>
                </View>
                
                {selectedTask.labels && selectedTask.labels.length > 0 ? (
                  <View style={styles.labelsContainer}>
                    {selectedTask.labels.map((label) => (
                      <View
                        key={label.id}
                        style={[styles.labelChipLarge, { backgroundColor: label.color + '20', borderColor: label.color }]}
                      >
                        <Text style={[styles.labelChipTextLarge, { color: label.color }]}>
                          {label.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyMessage}>No labels assigned</Text>
                )}
              </View>

              {/* Attachments Section */}
              <View style={styles.detailsSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    📎 Attachments ({attachments[selectedTask.id]?.length || 0})
                  </Text>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => addAttachmentToExistingTask(selectedTask.id)}
                    disabled={uploadingFile}
                  >
                    {uploadingFile ? (
                      <ActivityIndicator size="small" color="#6366F1" />
                    ) : (
                      <Text style={styles.addButtonText}>+ Add</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {attachments[selectedTask.id] && attachments[selectedTask.id].length > 0 ? (
                  <View style={styles.attachmentsListContainer}>
                    {attachments[selectedTask.id].map((attachment) => (
                      <View key={attachment.id} style={styles.attachmentItemLarge}>
                        <TouchableOpacity
                          style={styles.attachmentInfoLarge}
                          onPress={() => downloadAttachment(attachment)}
                        >
                          <Text style={styles.attachmentNameLarge} numberOfLines={1}>
                            📄 {attachment.file_name}
                          </Text>
                          <Text style={styles.attachmentSizeLarge}>
                            {formatFileSize(attachment.file_size)}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteAttachmentButtonLarge}
                          onPress={() => deleteAttachment(attachment.id, attachment.file_path, selectedTask.id)}
                        >
                          <Text style={styles.deleteAttachmentTextLarge}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyMessage}>No attachments</Text>
                )}
              </View>

              {/* Comments Section */}
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>
                  💬 Comments ({comments[selectedTask.id]?.length || 0})
                </Text>

                {comments[selectedTask.id] && comments[selectedTask.id].length > 0 ? (
                  <View style={styles.commentsListContainer}>
                    {comments[selectedTask.id].map((comment) => (
                      <View key={comment.id} style={styles.commentItem}>
                        <View style={styles.commentHeader}>
                          <View style={styles.commentAuthorInfo}>
                            <Text style={styles.commentAuthor}>
                              {comment.user_profile?.full_name || comment.user_profile?.username || 'Unknown'}
                            </Text>
                            <Text style={styles.commentTime}>
                              {formatDateTime(comment.created_at)}
                            </Text>
                          </View>
                          {comment.user_id === user?.id && (
                            <TouchableOpacity
                              onPress={() => deleteComment(comment.id, selectedTask.id)}
                            >
                              <Text style={styles.deleteCommentButton}>Delete</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <Text style={styles.commentText}>{comment.comment}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyMessage}>No comments yet</Text>
                )}

                {/* Add Comment Input */}
                <View style={styles.addCommentContainer}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Add a comment..."
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendCommentButton,
                      (!newComment.trim() || addingComment) && styles.sendCommentButtonDisabled
                    ]}
                    onPress={addComment}
                    disabled={!newComment.trim() || addingComment}
                  >
                    {addingComment ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.sendCommentButtonText}>Send</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Delete Task Button */}
              {(user?.id === selectedTask.created_by || user?.id === selectedTask.assigned_to) && (
                <TouchableOpacity
                  style={styles.deleteTaskButton}
                  onPress={() => deleteTask(selectedTask.id)}
                >
                  <Text style={styles.deleteTaskButtonText}>Delete Task</Text>
                </TouchableOpacity>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </Modal>

      {/* Label Selector Modal */}
      <Modal
        visible={showLabelSelector}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLabelSelector(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Manage Labels</Text>
            <TouchableOpacity onPress={() => setShowLabelSelector(false)}>
              <Text style={styles.closeButton}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.labelSelectorContent}>
            {allLabels.map((label) => {
              const isSelected = selectedTask?.labels?.some(l => l.id === label.id)
              return (
                <TouchableOpacity
                  key={label.id}
                  style={[
                    styles.labelSelectorItem,
                    isSelected && styles.labelSelectorItemSelected
                  ]}
                  onPress={() => {
                    if (selectedTask) {
                      toggleTaskLabel(selectedTask.id, label.id)
                      // Update local state immediately
                      setSelectedTask(prev => {
                        if (!prev) return prev
                        const labels = isSelected
                          ? prev.labels?.filter(l => l.id !== label.id)
                          : [...(prev.labels || []), label]
                        return { ...prev, labels }
                      })
                    }
                  }}
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

      {/* Add Task Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Task</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.closeButton}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView>
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
                minimumDate={new Date()}
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

            {/* Labels Selector */}
            <Text style={styles.label}>Labels</Text>
            <View style={styles.labelsSelectContainer}>
              {allLabels.map((label) => {
                const isSelected = newTask.labels.includes(label.id)
                return (
                  <TouchableOpacity
                    key={label.id}
                    style={[
                      styles.labelSelectChip,
                      isSelected && { backgroundColor: label.color + '30', borderColor: label.color }
                    ]}
                    onPress={() => toggleLabel(label.id)}
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
          </ScrollView>
               </KeyboardAvoidingView>
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
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  labelsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  labelChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  labelChipText: {
    fontSize: 9,
    fontWeight: '600',
  },
  moreLabelIndicator: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
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
  taskIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  iconBadgeText: {
    fontSize: 11,
    color: '#6B7280',
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
  detailsScrollView: {
    flex: 1,
  },
  detailsSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  detailsBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statusBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusTextLarge: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  priorityBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priorityTextLarge: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  detailsDescription: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 16,
  },
  detailsMetaContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  detailsMetaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailsMetaLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailsMetaValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  overdueText: {
    color: '#EF4444',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  manageLabelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
  },
  manageLabelButtonText: {
    color: '#6366F1',
    fontSize: 13,
    fontWeight: '600',
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#6366F1',
    fontSize: 13,
    fontWeight: '600',
  },
  labelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  labelChipLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  labelChipTextLarge: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  attachmentsListContainer: {
    gap: 8,
  },
  attachmentItemLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  attachmentInfoLarge: {
    flex: 1,
    marginRight: 8,
  },
  attachmentNameLarge: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    marginBottom: 4,
  },
  attachmentSizeLarge: {
    fontSize: 12,
    color: '#6B7280',
  },
  deleteAttachmentButtonLarge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAttachmentTextLarge: {
    color: '#EF4444',
    fontSize: 20,
    fontWeight: '600',
  },
  commentsListContainer: {
    marginTop: 8,
    gap: 12,
  },
  commentItem: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthorInfo: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  commentTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  deleteCommentButton: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  commentText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  addCommentContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
    maxHeight: 100,
  },
  sendCommentButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  sendCommentButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  sendCommentButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteTaskButton: {
    backgroundColor: '#EF4444',
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteTaskButtonText: {
    color: 'white',
    fontSize: 16,
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