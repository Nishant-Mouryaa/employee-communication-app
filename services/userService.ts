// services/userService.ts
import { supabase } from '../lib/supabase'
import { User } from '../types/tasks'

export const fetchUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name')
    .order('full_name')

  if (error) throw error
  return data || []
}