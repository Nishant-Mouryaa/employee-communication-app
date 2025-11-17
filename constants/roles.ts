// constants/roles.ts
import { UserRole } from '../types/announcement'

export const ROLES: { [key: string]: UserRole } = {
  employee: {
    canPost: false,
    canEditAll: false,
    canPin: false,
    canDeleteAll: false,
    isAdmin: false,
    canSchedule: false,
    canComment: true,
    canModerateComments: false
  },
  manager: {
    canPost: true,
    canEditAll: false,
    canPin: true,
    canDeleteAll: false,
    isAdmin: false,
    canSchedule: true,
    canComment: true,
    canModerateComments: true
  },
  admin: {
    canPost: true,
    canEditAll: true,
    canPin: true,
    canDeleteAll: true,
    isAdmin: true,
    canSchedule: true,
    canComment: true,
    canModerateComments: true
  }
}