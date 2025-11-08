// constants/home.ts
import { Dimensions } from 'react-native'

export const { width: SCREEN_WIDTH } = Dimensions.get('window')
export const IS_MOBILE = SCREEN_WIDTH < 768

export const ACTIVITY_ICONS = {
  message: '💬',
  task: '✓',
  announcement: '📢',
  default: '•'
} as const

export const ACTIVITY_COLORS = {
  message: '#6366f1',
  task: '#f59e0b',
  announcement: '#10b981',
  default: '#6366f1'
} as const