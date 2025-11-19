// services/exportService.ts
import { supabase } from '../lib/supabase'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { ExportOptions } from '../types/announcement'

export const exportService = {
  async exportToCSV(options: ExportOptions) {
    try {
      console.log('Starting CSV export with options:', options)
      
      // Build the base query
      let query = supabase
        .from('announcements')
        .select(`
          *,
          profiles:author_id (
            username, 
            full_name
          ),
          categories:category_id (
            name
          ),
          announcement_reads (
            count
          )
        `)

      // Add optional joins based on options
      if (options.includeComments) {
        query = query.select(`
          *,
          announcement_comments (
            *,
            profiles:user_id (
              username,
              full_name
            )
          )
        `)
      }

      if (options.includeAnalytics) {
        query = query.select(`
          *,
          announcement_analytics (*)
        `)
      }

      // Apply filters
      if (options.dateRange) {
        query = query
          .gte('created_at', options.dateRange.start.toISOString())
          .lte('created_at', options.dateRange.end.toISOString())
      }

      if (options.categories && options.categories.length > 0) {
        query = query.in('category_id', options.categories)
      }

      const { data, error } = await query

      if (error) {
        console.error('Supabase query error:', error)
        throw error
      }

      console.log(`Fetched ${data?.length || 0} announcements for CSV export`)

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
        'Read Count',
        'Comment Count',
        'Reaction Count'
      ]

      const rows = (data || []).map(announcement => {
        // Safely access nested properties
        const authorName = announcement.profiles?.full_name || 
                          announcement.profiles?.username || 
                          'Unknown'
        
        const categoryName = announcement.categories?.name || 'None'
        const readCount = announcement.announcement_reads?.[0]?.count || 0
        const commentCount = options.includeComments ? 
                           (announcement.announcement_comments?.length || 0) : 0

        return [
          announcement.id,
          `"${(announcement.title || '').replace(/"/g, '""')}"`,
          `"${(announcement.content || '').replace(/"/g, '""')}"`,
          `"${authorName.replace(/"/g, '""')}"`,
          `"${categoryName.replace(/"/g, '""')}"`,
          announcement.is_important ? 'Yes' : 'No',
          announcement.is_pinned ? 'Yes' : 'No',
          new Date(announcement.created_at).toLocaleDateString(),
          readCount.toString(),
          commentCount.toString(),
          (announcement.reaction_count || 0).toString()
        ]
      })

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

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Announcements as CSV'
        })
      } else {
        console.log('Sharing not available, file saved at:', filePath)
      }
      
      return { 
        success: true, 
        filePath,
        message: `Exported ${data?.length || 0} announcements successfully` 
      }
    } catch (error) {
      console.error('Error exporting to CSV:', error)
      throw new Error(`CSV export failed: ${error.message}`)
    }
  },

  async exportToJSON(options: ExportOptions) {
    try {
      console.log('Starting JSON export with options:', options)
      
      // Build base query - use separate queries to avoid complex joins
      let query = supabase
        .from('announcements')
        .select(`
          *,
          profiles:author_id (
            username, 
            full_name
          ),
          categories:category_id (
            name,
            icon,
            color
          )
        `)

      // Apply filters
      if (options.dateRange) {
        query = query
          .gte('created_at', options.dateRange.start.toISOString())
          .lte('created_at', options.dateRange.end.toISOString())
      }

      if (options.categories && options.categories.length > 0) {
        query = query.in('category_id', options.categories)
      }

      const { data: announcements, error } = await query

      if (error) {
        console.error('Supabase query error:', error)
        throw error
      }

      console.log(`Fetched ${announcements?.length || 0} announcements for JSON export`)

      // Fetch additional data separately to avoid complex joins
      let enhancedAnnouncements = announcements || []

      if (options.includeComments && announcements && announcements.length > 0) {
        // Fetch comments separately
        const announcementIds = announcements.map(a => a.id)
        const { data: comments, error: commentsError } = await supabase
          .from('announcement_comments')
          .select(`
            *,
            profiles:user_id (
              username,
              full_name
            )
          `)
          .in('announcement_id', announcementIds)

        if (!commentsError && comments) {
          // Group comments by announcement
          const commentsByAnnouncement = comments.reduce((acc, comment) => {
            const announcementId = comment.announcement_id
            if (!acc[announcementId]) {
              acc[announcementId] = []
            }
            acc[announcementId].push(comment)
            return acc
          }, {})

          // Add comments to announcements
          enhancedAnnouncements = enhancedAnnouncements.map(announcement => ({
            ...announcement,
            comments: commentsByAnnouncement[announcement.id] || []
          }))
        }
      }

      if (options.includeAnalytics && announcements && announcements.length > 0) {
        // Fetch analytics separately
        const announcementIds = announcements.map(a => a.id)
        const { data: analytics, error: analyticsError } = await supabase
          .from('announcement_analytics')
          .select('*')
          .in('announcement_id', announcementIds)

        if (!analyticsError && analytics) {
          // Group analytics by announcement
          const analyticsByAnnouncement = analytics.reduce((acc, analytic) => {
            const announcementId = analytic.announcement_id
            if (!acc[announcementId]) {
              acc[announcementId] = []
            }
            acc[announcementId].push(analytic)
            return acc
          }, {})

          // Add analytics to announcements
          enhancedAnnouncements = enhancedAnnouncements.map(announcement => ({
            ...announcement,
            analytics: analyticsByAnnouncement[announcement.id] || []
          }))
        }
      }

      if (options.includeAttachments && announcements && announcements.length > 0) {
        // Fetch attachments separately
        const announcementIds = announcements.map(a => a.id)
        const { data: attachments, error: attachmentsError } = await supabase
          .from('announcement_attachments')
          .select('*')
          .in('announcement_id', announcementIds)

        if (!attachmentsError && attachments) {
          // Group attachments by announcement
          const attachmentsByAnnouncement = attachments.reduce((acc, attachment) => {
            const announcementId = attachment.announcement_id
            if (!acc[announcementId]) {
              acc[announcementId] = []
            }
            acc[announcementId].push(attachment)
            return acc
          }, {})

          // Add attachments to announcements
          enhancedAnnouncements = enhancedAnnouncements.map(announcement => ({
            ...announcement,
            attachments: attachmentsByAnnouncement[announcement.id] || []
          }))
        }
      }

      // Create export data structure
      const exportData = {
        exported_at: new Date().toISOString(),
        total_count: enhancedAnnouncements.length,
        export_options: options,
        data: enhancedAnnouncements
      }

      const jsonContent = JSON.stringify(exportData, null, 2)

      const filename = `announcements_${Date.now()}.json`
      const filePath = `${FileSystem.documentDirectory}${filename}`
      
      await FileSystem.writeAsStringAsync(filePath, jsonContent, {
        encoding: FileSystem.EncodingType.UTF8
      })

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Export Announcements as JSON'
        })
      } else {
        console.log('Sharing not available, file saved at:', filePath)
      }
      
      return { 
        success: true, 
        filePath,
        message: `Exported ${enhancedAnnouncements.length} announcements successfully` 
      }
    } catch (error) {
      console.error('Error exporting to JSON:', error)
      throw new Error(`JSON export failed: ${error.message}`)
    }
  },

  async exportToPDF(options: ExportOptions) {
    try {
      // For now, provide a helpful message
      // You can implement this later with react-native-html-to-pdf
      // or a server-side PDF generation service
      
      console.log('PDF export not yet implemented')
      
      return {
        success: false,
        message: 'PDF export is not yet available. Please use CSV or JSON format for now.'
      }
      
      // Future implementation example:
      /*
      const htmlContent = this.generateHTMLForPDF(options)
      const pdf = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      })
      
      await Sharing.shareAsync(pdf.uri)
      */
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      throw new Error('PDF export is currently unavailable. Please use CSV or JSON format.')
    }
  },

  async exportToExcel(options: ExportOptions) {
    try {
      // For Excel export, you can use the CSV method since Excel can open CSV files
      // Or implement proper Excel generation with a library like xlsx
      
      console.log('Excel export using CSV format')
      const result = await this.exportToCSV(options)
      
      return {
        ...result,
        message: 'Exported as CSV (compatible with Excel)'
      }
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      throw new Error(`Excel export failed: ${error.message}`)
    }
  }
}