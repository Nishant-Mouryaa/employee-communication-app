// services/versionHistoryService.ts
import { supabase } from '../lib/supabase'
import { AnnouncementVersion } from '../types/announcement'

export const versionHistoryService = {
  async getVersionHistory(announcementId: string): Promise<AnnouncementVersion[]> {
    try {
      const { data, error } = await supabase
        .from('announcement_versions')
        .select(`
          *,
          profiles:changed_by (
            username,
            full_name
          )
        `)
        .eq('announcement_id', announcementId)
        .order('version_number', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching version history:', error)
      return []
    }
  },

  async getVersion(versionId: string): Promise<AnnouncementVersion | null> {
    try {
      const { data, error } = await supabase
        .from('announcement_versions')
        .select(`
          *,
          profiles:changed_by (
            username,
            full_name
          )
        `)
        .eq('id', versionId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching version:', error)
      return null
    }
  },

  async restoreVersion(announcementId: string, versionId: string) {
    try {
      // Get the version to restore
      const version = await this.getVersion(versionId)
      if (!version) throw new Error('Version not found')

      // Update the announcement with the version data
      const { error } = await supabase
        .from('announcements')
        .update({
          title: version.title,
          content: version.content,
          is_important: version.is_important,
          is_pinned: version.is_pinned,
          category_id: version.category_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', announcementId)

      if (error) throw error
    } catch (error) {
      console.error('Error restoring version:', error)
      throw error
    }
  },

  compareVersions(version1: AnnouncementVersion, version2: AnnouncementVersion) {
    const changes: Array<{
      field: string
      old: any
      new: any
    }> = []

    if (version1.title !== version2.title) {
      changes.push({ field: 'title', old: version1.title, new: version2.title })
    }

    if (version1.content !== version2.content) {
      changes.push({ field: 'content', old: version1.content, new: version2.content })
    }

    if (version1.is_important !== version2.is_important) {
      changes.push({ field: 'important', old: version1.is_important, new: version2.is_important })
    }

    if (version1.is_pinned !== version2.is_pinned) {
      changes.push({ field: 'pinned', old: version1.is_pinned, new: version2.is_pinned })
    }

    if (version1.category_id !== version2.category_id) {
      changes.push({ field: 'category', old: version1.category_id, new: version2.category_id })
    }

    return changes
  }
}