// services/announcementService.ts
import { supabase } from '../lib/supabase'
import { Alert } from 'react-native'

export const announcementService = {
  async markAsRead(announcementId: string, userId: string, organizationId: string) {
    try {
      const { error } = await supabase
        .from('announcement_reads')
        .upsert({
          announcement_id: announcementId,
          user_id: userId,
          read_at: new Date().toISOString(),
          organization_id: organizationId,
        }, {
          onConflict: 'announcement_id,user_id'
        })

      if (error) throw error
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  },

  async toggleReaction(announcementId: string, userId: string, organizationId: string) {
    try {
      const { data: existingReaction, error: checkError } = await supabase
        .from('announcement_reactions')
        .select('id')
        .eq('announcement_id', announcementId)
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existingReaction) {
        const { error: deleteError } = await supabase
          .from('announcement_reactions')
          .delete()
          .eq('announcement_id', announcementId)
          .eq('user_id', userId)
          .eq('organization_id', organizationId)

        if (deleteError) throw deleteError
      } else {
        const { error: insertError } = await supabase
          .from('announcement_reactions')
          .insert({
            announcement_id: announcementId,
            user_id: userId,
            reaction_type: 'like',
            organization_id: organizationId,
          })

        if (insertError) throw insertError
      }
    } catch (error: any) {
      console.error('Error toggling reaction:', error)
      if (error.code !== '23505') {
        Alert.alert('Error', 'Failed to update reaction')
      }
    }
  },

  async togglePin(announcementId: string, currentPinStatus: boolean, organizationId: string) {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_pinned: !currentPinStatus })
        .eq('id', announcementId)
        .eq('organization_id', organizationId)

      if (error) throw error

      Alert.alert('Success', !currentPinStatus ? 'Announcement pinned' : 'Announcement unpinned')
    } catch (error) {
      console.error('Error toggling pin:', error)
      Alert.alert('Error', 'Failed to update pin status')
    }
  },

  async createAnnouncement(announcement: any, userId: string, organizationId: string) {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .insert([{
          title: announcement.title.trim(),
          content: announcement.content.trim(),
          author_id: userId,
          is_important: announcement.isImportant,
          is_pinned: announcement.isPinned,
          category_id: announcement.category_id || null,
          organization_id: organizationId,
        }])
        .select()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating announcement:', error)
      throw error
    }
  },

  async updateAnnouncement(announcementId: string, announcement: any, organizationId: string) {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({
          title: announcement.title.trim(),
          content: announcement.content.trim(),
          is_important: announcement.isImportant,
          is_pinned: announcement.isPinned,
          category_id: announcement.category_id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', announcementId)
        .eq('organization_id', organizationId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating announcement:', error)
      throw error
    }
  },

  async deleteAnnouncement(announcementId: string, organizationId: string) {
    try {
      await supabase
        .from('announcement_reactions')
        .delete()
        .eq('announcement_id', announcementId)
        .eq('organization_id', organizationId)

      await supabase
        .from('announcement_reads')
        .delete()
        .eq('announcement_id', announcementId)
        .eq('organization_id', organizationId)

      await supabase
        .from('announcement_attachments')
        .delete()
        .eq('announcement_id', announcementId)
        .eq('organization_id', organizationId)

      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcementId)
        .eq('organization_id', organizationId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting announcement:', error)
      throw error
    }
  },

  async uploadAttachments(announcementId: string, files: File[], userId: string, organizationId: string) {
    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('announcement-attachments')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('announcement-attachments')
          .getPublicUrl(fileName)

        const { error: dbError } = await supabase
          .from('announcement_attachments')
          .insert({
            announcement_id: announcementId,
            file_name: file.name,
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: userId,
            organization_id: organizationId,
          })

        if (dbError) throw dbError
      }

      await supabase
        .from('announcements')
        .update({ has_attachments: true })
        .eq('id', announcementId)
    } catch (error) {
      console.error('Error uploading attachments:', error)
      throw error
    }
  }
}