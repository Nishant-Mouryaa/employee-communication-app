// services/userService.ts
import { supabase } from '../lib/supabase'
import { User } from '../types/tasks'

export const fetchUsers = async (organizationId?: string): Promise<User[]> => {
  let query = supabase
    .from('profiles')
    .select('id, username, full_name')
    .order('full_name')

  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}