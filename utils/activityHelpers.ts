// utils/activityHelpers.ts
import { ACTIVITY_ICONS, ACTIVITY_COLORS } from '../constants/home'

export const getActivityIcon = (type: string): string => {
  return ACTIVITY_ICONS[type as keyof typeof ACTIVITY_ICONS] || ACTIVITY_ICONS.default
}

export const getActivityColor = (type: string): string => {
  return ACTIVITY_COLORS[type as keyof typeof ACTIVITY_COLORS] || ACTIVITY_COLORS.default
}