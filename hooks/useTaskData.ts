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

export const useTaskData = (userId: string | undefined) => {
  const [tasks, setTasks] = useState<TaskWithLabels[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [attachments, setAttachments] = useState<Record<string, TaskAttachment[]>>({})
  const [comments, setComments] = useState<Record<string, TaskComment[]>>({})
  const [allLabels, setAllLabels] = useState<TaskLabel[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TaskFilter>('all')

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchTasks(filter)
      setTasks(data)
    } catch (error) {
      console.error('Error fetching tasks:', error)
      Alert.alert('Error', 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [filter])

  const loadUsers = useCallback(async () => {
    try {
      const data = await fetchUsers()
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }, [])

  const loadLabels = useCallback(async () => {
    try {
      const data = await fetchLabels()
      setAllLabels(data)
    } catch (error) {
      console.error('Error fetching labels:', error)
    }
  }, [])

  const loadAttachments = useCallback(async (taskId: string) => {
    try {
      const data = await fetchAttachments(taskId)
      setAttachments(prev => ({ ...prev, [taskId]: data }))
    } catch (error) {
      console.error('Error fetching attachments:', error)
    }
  }, [])

  const loadComments = useCallback(async (taskId: string) => {
    try {
      const data = await fetchComments(taskId)
      setComments(prev => ({ ...prev, [taskId]: data }))
    } catch (error) {
      console.error('Error fetching comments:', error)
      setComments(prev => ({ ...prev, [taskId]: [] }))
    }
  }, [])

  const addTask = useCallback(async (
    taskData: NewTaskForm,
    files: SelectedFile[]
  ): Promise<void> => {
    if (!userId) throw new Error('User not authenticated')

    const task = await createTask(taskData, userId)

    // Add labels
    if (taskData.labels.length > 0) {
      await assignLabelsToTask(task.id, taskData.labels)
    }

    // Upload attachments
    for (const file of files) {
      await uploadAttachment(file, task.id, userId)
    }

    await loadTasks()
  }, [userId, loadTasks])

  const updateStatus = useCallback(async (
    taskId: string,
    newStatus: TaskWithLabels['status']
  ) => {
    try {
      await updateTaskStatus(taskId, newStatus)
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ))
    } catch (error) {
      console.error('Error updating task status:', error)
      Alert.alert('Error', 'Failed to update task status')
      await loadTasks()
    }
  }, [loadTasks])

  const removeTask = useCallback(async (taskId: string) => {
    try {
      const taskAttachments = attachments[taskId] || []
      if (taskAttachments.length > 0) {
        await deleteAllTaskAttachments(taskAttachments)
      }

      await deleteTask(taskId)
      setTasks(prev => prev.filter(task => task.id !== taskId))
    } catch (error) {
      console.error('Error deleting task:', error)
      Alert.alert('Error', 'Failed to delete task')
    }
  }, [attachments])

  const toggleTaskLabel = useCallback(async (taskId: string, labelId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId)
      if (!task) return

      const hasLabel = task.labels?.some(l => l.id === labelId)

      if (hasLabel) {
        await removeLabelFromTask(taskId, labelId)
      } else {
        await assignLabelToTask(taskId, labelId)
      }

      await loadTasks()
    } catch (error) {
      console.error('Error toggling label:', error)
      Alert.alert('Error', 'Failed to update label')
    }
  }, [tasks, loadTasks])

  const addTaskComment = useCallback(async (taskId: string, comment: string) => {
    if (!userId) throw new Error('User not authenticated')

    await addComment(taskId, userId, comment)
    await loadComments(taskId)
  }, [userId, loadComments])

  const removeComment = useCallback(async (commentId: string, taskId: string) => {
    await deleteComment(commentId)
    await loadComments(taskId)
  }, [loadComments])

  const uploadTaskAttachment = useCallback(async (file: SelectedFile, taskId: string) => {
    if (!userId) throw new Error('User not authenticated')

    await uploadAttachment(file, taskId, userId)
    await loadAttachments(taskId)
  }, [userId, loadAttachments])

  const removeAttachment = useCallback(async (
    attachmentId: string,
    filePath: string,
    taskId: string
  ) => {
    await deleteAttachment(attachmentId, filePath)
    await loadAttachments(taskId)
  }, [loadAttachments])

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