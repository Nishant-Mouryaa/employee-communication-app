// hooks/useCategories.ts
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Category } from '../types/announcement'

export const useCategories = (organizationId: string | undefined) => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)

  const fetchCategories = async () => {
    if (!organizationId) return
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('announcement_categories')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [organizationId])

  return { categories, loading, fetchCategories }
}