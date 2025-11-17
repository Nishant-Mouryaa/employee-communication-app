// services/exportService.ts
import { supabase } from '../lib/supabase'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { ExportOptions } from '../types/announcement'

export const exportService = {
  async exportToCSV(options: ExportOptions) {
    try {
      // Fetch announcements
      let query = supabase
        .from('announcements')
        .select(`
          *,
          profiles:author_id(username, full_name),
          categories:category_id(name),
          ${options.includeComments ? 'announcement_comments(*),' : ''}
          ${options.includeAnalytics ? 'announcement_analytics(*),' : ''}
          announcement_reads(count)
        `)

      if (options.dateRange) {
        query = query
          .gte('created_at', options.dateRange.start.toISOString())
          .lte('created_at', options.dateRange.end.toISOString())
      }

      if (options.categories && options.categories.length > 0) {
        query = query.in('category_id', options.categories)
      }

      const { data, error } = await query

      if (error) throw error

      // Generate CSV content
      const headers = [
        'ID',
        'Title',
        'Content',
        'Author',
        'Category',
        'Important',
        'Pinned',
        'Created At',
        'Views',
        'Reactions',
        'Comments'
      ]

      const rows = (data || []).map(announcement => [
        announcement.id,
        `"${announcement.title.replace(/"/g, '""')}"`,
        `"${announcement.content.replace(/"/g, '""')}"`,
        announcement.profiles?.full_name || 'Unknown',
        announcement.categories?.name || 'None',
        announcement.is_important ? 'Yes' : 'No',
        announcement.is_pinned ? 'Yes' : 'No',
        new Date(announcement.created_at).toLocaleDateString(),
        announcement.announcement_reads?.[0]?.count || 0,
        announcement.reaction_count || 0,
        announcement.comment_count || 0
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')

      // Save and share file
      const filename = `announcements_${Date.now()}.csv`
      const filePath = `${FileSystem.documentDirectory}${filename}`
      
      await FileSystem.writeAsStringAsync(filePath, csvContent, {
        encoding: FileSystem.EncodingType.UTF8
      })

      await Sharing.shareAsync(filePath)
      
      return { success: true, filePath }
    } catch (error) {
      console.error('Error exporting to CSV:', error)
      throw error
    }
  },

  async exportToJSON(options: ExportOptions) {
    try {
      let query = supabase
        .from('announcements')
        .select(`
          *,
          profiles:author_id(username, full_name, email),
          categories:category_id(*),
          ${options.includeComments ? 'announcement_comments(*, profiles:user_id(*)),' : ''}
          ${options.includeAnalytics ? 'announcement_analytics(*),' : ''}
          ${options.includeAttachments ? 'announcement_attachments(*),' : ''}
          announcement_reads(*),
          announcement_reactions(*)
        `)

      if (options.dateRange) {
        query = query
          .gte('created_at', options.dateRange.start.toISOString())
          .lte('created_at', options.dateRange.end.toISOString())
      }

      if (options.categories && options.categories.length > 0) {
        query = query.in('category_id', options.categories)
      }

      const { data, error } = await query

      if (error) throw error

      const exportData = {
        exported_at: new Date().toISOString(),
        total_count: data?.length || 0,
        options,
        announcements: data
      }

      const jsonContent = JSON.stringify(exportData, null, 2)

      const filename = `announcements_${Date.now()}.json`
      const filePath = `${FileSystem.documentDirectory}${filename}`
      
      await FileSystem.writeAsStringAsync(filePath, jsonContent, {
        encoding: FileSystem.EncodingType.UTF8
      })

      await Sharing.shareAsync(filePath)
      
      return { success: true, filePath }
    } catch (error) {
      console.error('Error exporting to JSON:', error)
      throw error
    }
  },

  async exportToPDF(options: ExportOptions) {
    // For PDF export, you'll need to use a library like react-native-html-to-pdf
    // or send data to a server endpoint that generates PDFs
    try {
      // This is a placeholder - implement based on your needs
      console.log('PDF export not yet implemented')
      throw new Error('PDF export requires additional setup')
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      throw error
    }
  }
}