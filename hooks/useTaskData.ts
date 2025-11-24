// hooks/useTaskData.ts
import { useState, useCallback } from 'react'
import { Alert } from 'react-native'
import {
  TaskWithLabels,
  TaskAttachment,
  TaskComment,
  TaskLabel,
  User,
  TaskFilter,
  NewTaskForm,
  SelectedFile
} from '../types/tasks'
import { fetchTasks, createTask, updateTaskStatus, deleteTask } from '../services/taskService'
import { fetchLabels, assignLabelsToTask, assignLabelToTask, removeLabelFromTask } from '../services/taskLabelService'
import { fetchAttachments, uploadAttachment, deleteAttachment, deleteAllTaskAttachments } from '../services/taskAttachmentService'
import { fetchComments, addComment, deleteComment } from '../services/taskCommentService'
import { fetchUsers } from '../services/userService'

export const useTaskData = (userId: string | undefined, organizationId: string | undefined) => {
  const [tasks, setTasks] = useState<TaskWithLabels[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [attachments, setAttachments] = useState<Record<string, TaskAttachment[]>>({})
  const [comments, setComments] = useState<Record<string, TaskComment[]>>({})
  const [allLabels, setAllLabels] = useState<TaskLabel[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TaskFilter>('all')

  const loadTasks = useCallback(async () => {
    if (!organizationId) return
    try {
      setLoading(true)
      const data = await fetchTasks(filter, organizationId)
      setTasks(data)
    } catch (error) {
      console.error('Error fetching tasks:', error)
      Alert.alert('Error', 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [filter, organizationId])

  const loadUsers = useCallback(async () => {
    if (!organizationId) return
    try {
      const data = await fetchUsers(organizationId)
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }, [organizationId])

  const loadLabels = useCallback(async () => {
    if (!organizationId) return
    try {
      const data = await fetchLabels(organizationId)
      setAllLabels(data)
    } catch (error) {
      console.error('Error fetching labels:', error)
    }
  }, [organizationId])

  const loadAttachments = useCallback(async (taskId: string) => {
    if (!organizationId) return
    try {
      const data = await fetchAttachments(taskId, organizationId)
      setAttachments(prev => ({ ...prev, [taskId]: data }))
    } catch (error) {
      console.error('Error fetching attachments:', error)
    }
  }, [organizationId])

  const loadComments = useCallback(async (taskId: string) => {
    if (!organizationId) return
    try {
      const data = await fetchComments(taskId, organizationId)
      setComments(prev => ({ ...prev, [taskId]: data }))
    } catch (error) {
      console.error('Error fetching comments:', error)
      setComments(prev => ({ ...prev, [taskId]: [] }))
    }
  }, [organizationId])

  const addTask = useCallback(async (
    taskData: NewTaskForm,
    files: SelectedFile[]
  ): Promise<void> => {
    if (!userId || !organizationId) throw new Error('User not authenticated')

    const task = await createTask(taskData, userId, organizationId)

    // Add labels
    if (taskData.labels.length > 0) {
      await assignLabelsToTask(task.id, taskData.labels, organizationId)
    }

    // Upload attachments
    for (const file of files) {
      await uploadAttachment(file, task.id, userId, organizationId)
    }

    await loadTasks()
  }, [userId, organizationId, loadTasks])

  const updateStatus = useCallback(async (
    taskId: string,
    newStatus: TaskWithLabels['status']
  ) => {
    if (!organizationId) return
    try {
      await updateTaskStatus(taskId, newStatus, organizationId)
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ))
    } catch (error) {
      console.error('Error updating task status:', error)
      Alert.alert('Error', 'Failed to update task status')
      await loadTasks()
    }
  }, [organizationId, loadTasks])

  const removeTask = useCallback(async (taskId: string) => {
    if (!organizationId) return
    try {
      const taskAttachments = attachments[taskId] || []
      if (taskAttachments.length > 0) {
        await deleteAllTaskAttachments(taskAttachments)
      }

      await deleteTask(taskId, organizationId)
      setTasks(prev => prev.filter(task => task.id !== taskId))
    } catch (error) {
      console.error('Error deleting task:', error)
      Alert.alert('Error', 'Failed to delete task')
    }
  }, [attachments, organizationId])

  const toggleTaskLabel = useCallback(async (taskId: string, labelId: string) => {
    if (!organizationId) return
    try {
      const task = tasks.find(t => t.id === taskId)
      if (!task) return

      const hasLabel = task.labels?.some(l => l.id === labelId)

      if (hasLabel) {
        await removeLabelFromTask(taskId, labelId, organizationId)
      } else {
        await assignLabelToTask(taskId, labelId, organizationId)
      }

      await loadTasks()
    } catch (error) {
      console.error('Error toggling label:', error)
      Alert.alert('Error', 'Failed to update label')
    }
  }, [tasks, organizationId, loadTasks])

  const addTaskComment = useCallback(async (taskId: string, comment: string) => {
    if (!userId || !organizationId) throw new Error('User not authenticated')

    await addComment(taskId, userId, comment, organizationId)
    await loadComments(taskId)
  }, [userId, organizationId, loadComments])

  const removeComment = useCallback(async (commentId: string, taskId: string) => {
    if (!organizationId) return
    await deleteComment(commentId, organizationId)
    await loadComments(taskId)
  }, [organizationId, loadComments])

  const uploadTaskAttachment = useCallback(async (file: SelectedFile, taskId: string) => {
    if (!userId || !organizationId) throw new Error('User not authenticated')

    await uploadAttachment(file, taskId, userId, organizationId)
    await loadAttachments(taskId)
  }, [userId, organizationId, loadAttachments])

  const removeAttachment = useCallback(async (
    attachmentId: string,
    filePath: string,
    taskId: string
  ) => {
    if (!organizationId) return
    await deleteAttachment(attachmentId, filePath, organizationId)
    await loadAttachments(taskId)
  }, [organizationId, loadAttachments])

  return {
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
  }
}