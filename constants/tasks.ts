// constants/tasks.ts
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_COMMENT_LENGTH = 500

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export const STATUS_COLORS: Record<TaskStatus, string> = {
  'todo': '#EF4444',
  'in-progress': '#F59E0B',
  'done': '#10B981',
}

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  'high': '#EF4444',
  'medium': '#F59E0B',
  'low': '#10B981',
}