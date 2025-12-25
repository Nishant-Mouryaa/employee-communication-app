  // screens/TasksScreen.tsx
  import React, { useState, useEffect, useCallback } from 'react'
  import { View, StyleSheet, TouchableOpacity, Text, Alert, ActivityIndicator, Linking } from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from '../hooks/useTenant'
import { useTaskData } from '../hooks/useTaskData'
import { useTaskRealtime } from '../hooks/useTaskRealtime'
import { useDocumentPicker } from '../hooks/useDocumentPicker'
  import { TaskWithLabels, NewTaskForm, TaskAttachment } from '../types/tasks'
  import { getNextStatus } from '../utils/taskHelpers'
  import { downloadAttachment } from '../services/taskAttachmentService'
  import { MAX_FILE_SIZE } from '../constants/tasks'
  import { Ionicons } from '@expo/vector-icons'
import {
    TaskHeader,
    TaskFilters,
    TaskList,
    AddTaskModal,
    TaskDetailsModal,
    LabelSelector
  } from '../components/tasks'
import { OrganizationSwitcher } from '../components/common/OrganizationSwitcher'

  export default function TasksScreen() {
    const { user } = useAuth()
  const { organizationId, loading: tenantLoading } = useTenant()
    const [showAddModal, setShowAddModal] = useState(false)
    const [showTaskDetails, setShowTaskDetails] = useState(false)
    const [showUserSelector, setShowUserSelector] = useState(false)
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [showLabelSelector, setShowLabelSelector] = useState(false)
    const [selectedTask, setSelectedTask] = useState<TaskWithLabels | null>(null)
    const [newComment, setNewComment] = useState('')
    const [addingTask, setAddingTask] = useState(false)
    const [uploadingFile, setUploadingFile] = useState(false)
    const [addingComment, setAddingComment] = useState(false)

    const {
      tasks,
      users,
      attachments,
      comments,
      allLabels,
      loading,
      filter,
      setFilter,
      loadTasks,
      loadUsers,
      loadLabels,
      loadAttachments,
      loadComments,
      addTask,
      updateStatus,
      removeTask,
      toggleTaskLabel,
      addTaskComment,
      removeComment,
      uploadTaskAttachment,
      removeAttachment,
    } = useTaskData(user?.id, organizationId)

    const { pickDocument, selectedFiles, addFile, removeFile, clearFiles } = useDocumentPicker()

    const [newTask, setNewTask] = useState<NewTaskForm>({
      title: '',
      description: '',
      assigned_to: '',
      assigned_to_name: 'Select user...',
      due_date: new Date(),
      priority: 'medium',
      attachments: [],
      labels: []
    })

    // Setup realtime subscriptions
    useTaskRealtime({
      userId: user?.id,
      organizationId,
      onTasksChange: loadTasks,
      onAttachmentsChange: loadAttachments,
      onCommentsChange: loadComments
    })

    // Initial data fetch
    useEffect(() => {
      if (user && organizationId) {
        loadTasks()
        loadUsers()
        loadLabels()
      }
    }, [user, organizationId, loadTasks, loadUsers, loadLabels])

    // Load attachments and comments when tasks change
    useEffect(() => {
      if (!organizationId) return
      if (tasks.length > 0) {
        tasks.forEach(task => {
          loadAttachments(task.id)
          loadComments(task.id)
        })
      }
    }, [tasks.length, organizationId, loadAttachments, loadComments])

    const handleAddTask = useCallback(async () => {
      if (!newTask.title.trim() || !user) return

      try {
        setAddingTask(true)
        setUploadingFile(newTask.attachments.length > 0)

        await addTask(newTask, newTask.attachments)

        // Reset form
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
        clearFiles()
        setShowAddModal(false)
        Alert.alert('Success', 'Task created successfully!')
      } catch (error) {
        console.error('Error creating task:', error)
        Alert.alert('Error', 'Failed to create task')
      } finally {
        setAddingTask(false)
        setUploadingFile(false)
      }
    }, [newTask, user, addTask, clearFiles])

    const handleStatusPress = useCallback((task: TaskWithLabels) => {
      const nextStatus = getNextStatus(task.status)
      updateStatus(task.id, nextStatus)
    }, [updateStatus])

    const handleTaskPress = useCallback((task: TaskWithLabels) => {
      setSelectedTask(task)
      setShowTaskDetails(true)
    }, [])

    const handleAddComment = useCallback(async () => {
      if (!newComment.trim() || !selectedTask || !user) return

      try {
        setAddingComment(true)
        await addTaskComment(selectedTask.id, newComment)
        setNewComment('')
      } catch (error) {
        console.error('Error adding comment:', error)
        Alert.alert('Error', 'Failed to add comment')
      } finally {
        setAddingComment(false)
      }
    }, [newComment, selectedTask, user, addTaskComment])

    const handleDeleteComment = useCallback((commentId: string) => {
      if (!selectedTask) return

      Alert.alert(
        'Delete Comment',
        'Are you sure you want to delete this comment?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            onPress: async () => {
              try {
                await removeComment(commentId, selectedTask.id)
              } catch (error) {
                console.error('Error deleting comment:', error)
                Alert.alert('Error', 'Failed to delete comment')
              }
            }, 
            style: 'destructive' 
          }
        ]
      )
    }, [selectedTask, removeComment])

    const handleAddAttachment = useCallback(async () => {
      if (!selectedTask) return

      try {
        const file = await pickDocument()
        if (!file) return

        if (file.size > MAX_FILE_SIZE) {
          Alert.alert('Error', 'File size must be less than 10MB')
          return
        }

        setUploadingFile(true)
        await uploadTaskAttachment(file, selectedTask.id)
        Alert.alert('Success', 'File uploaded successfully!')
      } catch (error) {
        console.error('Error adding attachment:', error)
        Alert.alert('Error', 'Failed to upload file')
      } finally {
        setUploadingFile(false)
      }
    }, [selectedTask, pickDocument, uploadTaskAttachment])

    const handleDownloadAttachment = useCallback(async (attachment: TaskAttachment) => {
      try {
        const url = await downloadAttachment(attachment)
        await Linking.openURL(url)
      } catch (error) {
        console.error('Error downloading attachment:', error)
        Alert.alert('Error', 'Failed to download file')
      }
    }, [])

    const handleDeleteAttachment = useCallback((attachment: TaskAttachment) => {
      if (!selectedTask) return

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
                await removeAttachment(attachment.id, attachment.file_path, selectedTask.id)
                Alert.alert('Success', 'File deleted successfully!')
              } catch (error) {
                console.error('Error deleting attachment:', error)
                Alert.alert('Error', 'Failed to delete file')
              }
            }
          }
        ]
      )
    }, [selectedTask, removeAttachment])

    const handleDeleteTask = useCallback(() => {
      if (!selectedTask) return

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
                await removeTask(selectedTask.id)
                setShowTaskDetails(false)
                setSelectedTask(null)
              } catch (error) {
                console.error('Error deleting task:', error)
                Alert.alert('Error', 'Failed to delete task')
              }
            }
          }
        ]
      )
    }, [selectedTask, removeTask])

    const handleToggleLabel = useCallback((labelId: string) => {
      setNewTask(prev => {
        const labels = prev.labels.includes(labelId)
          ? prev.labels.filter(id => id !== labelId)
          : [...prev.labels, labelId]
        return { ...prev, labels }
      })
    }, [])

    const handleToggleTaskLabel = useCallback(async (labelId: string) => {
      if (!selectedTask) return

      try {
        await toggleTaskLabel(selectedTask.id, labelId)
        
        // Update local state immediately
        setSelectedTask(prev => {
          if (!prev) return prev
          const hasLabel = prev.labels?.some(l => l.id === labelId)
          const label = allLabels.find(l => l.id === labelId)
          
          if (!label) return prev
          
          const labels = hasLabel
            ? prev.labels?.filter(l => l.id !== labelId)
            : [...(prev.labels || []), label]
          
          return { ...prev, labels }
        })
      } catch (error) {
        console.error('Error toggling label:', error)
      }
    }, [selectedTask, toggleTaskLabel, allLabels])

    const handlePickFile = useCallback(async () => {
      const file = await pickDocument()
      if (file) {
        setNewTask(prev => ({
          ...prev,
          attachments: [...prev.attachments, file]
        }))
      }
    }, [pickDocument])

    const handleRemoveFile = useCallback((index: number) => {
      setNewTask(prev => ({
        ...prev,
        attachments: prev.attachments.filter((_, i) => i !== index)
      }))
    }, [])

    if (tenantLoading || !organizationId || (loading && tasks.length === 0)) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>
            {tenantLoading || !organizationId ? 'Loading organization...' : 'Loading tasks...'}
          </Text>
        </View>
      )
    }

    return (
      <View style={styles.container}>
       
          <TaskHeader 
        onAddTaskPress={() => setShowAddModal(true)}
        activeFilter={filter}
        onFilterChange={setFilter}
      />

        <TaskFilters activeFilter={filter} onFilterChange={setFilter} />


    
    <TaskList
        tasks={tasks}
        attachments={attachments}
        comments={comments}
        loading={loading}
        filterType={filter}
        onTaskPress={handleTaskPress}
        onStatusPress={handleStatusPress}
        onRefresh={loadTasks}
      />
       {/* <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity> */}

        <AddTaskModal
          visible={showAddModal}
          newTask={newTask}
          users={users}
          labels={allLabels}
          showUserSelector={showUserSelector}
          showDatePicker={showDatePicker}
          adding={addingTask}
          uploading={uploadingFile}
          onClose={() => setShowAddModal(false)}
          onFieldChange={(field, value) => setNewTask(prev => ({ ...prev, [field]: value }))}
          onUserSelectorToggle={() => setShowUserSelector(!showUserSelector)}
          onDatePickerToggle={() => setShowDatePicker(!showDatePicker)}
          onLabelToggle={handleToggleLabel}
          onFileAdd={handlePickFile}
          onFileRemove={handleRemoveFile}
          onSubmit={handleAddTask}
        />

        <TaskDetailsModal
          visible={showTaskDetails}
          task={selectedTask}
          attachments={selectedTask ? attachments[selectedTask.id] || [] : []}
          comments={selectedTask ? comments[selectedTask.id] || [] : []}
          currentUserId={user?.id || ''}
          newComment={newComment}
          uploadingFile={uploadingFile}
          addingComment={addingComment}
          onClose={() => {
            setShowTaskDetails(false)
            setSelectedTask(null)
          }}
          onCommentChange={setNewComment}
          onCommentSubmit={handleAddComment}
          onCommentDelete={handleDeleteComment}
          onAttachmentAdd={handleAddAttachment}
          onAttachmentDownload={handleDownloadAttachment}
          onAttachmentDelete={handleDeleteAttachment}
          onLabelManage={() => setShowLabelSelector(true)}
          onTaskDelete={handleDeleteTask}
        />

        <LabelSelector
          visible={showLabelSelector}
          labels={allLabels}
          selectedLabelIds={selectedTask?.labels?.map(l => l.id) || []}
          onClose={() => setShowLabelSelector(false)}
          onToggle={handleToggleTaskLabel}
        />
      </View>
    )
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f8f9fa',
    },
fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
  })