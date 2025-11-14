// types/tasks.ts
export type TaskStatus = 'todo' | 'in-progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskFilter = 'all' | TaskStatus

export interface TaskLabel {
  id: string
  name: string
  color: string
}

export interface User {
  id: string
  username: string
  full_name: string
}

export interface TaskAttachment {
  id: string
  task_id: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  uploaded_by: string
  created_at: string
}

export interface TaskComment {
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

export interface Task {
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
  status: TaskStatus
  priority: TaskPriority
  created_at: string
}

export interface TaskWithLabels extends Task {
  labels?: TaskLabel[]
}

export interface SelectedFile {
  uri: string
  name: string
  size: number
  mimeType: string
}

export interface NewTaskForm {
  title: string
  description: string
  assigned_to: string
  assigned_to_name: string
  due_date: Date
  priority: TaskPriority
  attachments: SelectedFile[]
  labels: string[]
}