// hooks/useUserRole.ts
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { UserRole } from '../types/announcement'
import { ROLES } from '../constants/roles'

export const useUserRole = () => {
  const { user } = useAuth()
  const [userRole, setUserRole] = useState<UserRole>(ROLES.employee)

  const checkUserRole = async () => {
    if (!user) {
      setUserRole(ROLES.employee)
      return
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error) {
        setUserRole(ROLES.employee)
        return
      }

      switch (profile?.role) {
        case 'admin':
          setUserRole(ROLES.admin)
          break
        case 'manager':
          setUserRole(ROLES.manager)
          break
        default:
          setUserRole(ROLES.employee)
      }
    } catch (error) {
      console.error('Error in checkUserRole:', error)
      setUserRole(ROLES.employee)
    }
  }

  useEffect(() => {
    checkUserRole()
  }, [user])

  return { userRole, checkUserRole }
}