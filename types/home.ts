// types/home.ts
export interface Stats {
  unreadMessages: number
  pendingTasks: number
  recentActivities: Activity[]
}

export interface Activity {
  id: string
  text: string
  time: string
  type: 'message' | 'task' | 'announcement'
}

export type QuickAction = 'createTask' | 'postAnnouncement' | 'startChat' | 'calendar'