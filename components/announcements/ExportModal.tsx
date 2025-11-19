// components/announcements/ExportModal.tsx
import React, { useState } from 'react'
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useCategories } from '../../hooks/useCategories'
import { exportService } from '../../services/exportService'
import { ExportOptions, ExportFormat } from '../../types/announcement'
import { useLanguage } from '../../hooks/useLanguage'

interface ExportModalProps {
  visible: boolean
  onClose: () => void
}

export const ExportModal: React.FC<ExportModalProps> = ({ visible, onClose }) => {
  const { t } = useLanguage()
  const { categories } = useCategories()
  const [exporting, setExporting] = useState(false)
  const [showStartPicker, setShowStartPicker] = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)

  const [options, setOptions] = useState<ExportOptions>({
    format: 'csv',
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    },
    includeComments: true,
    includeAnalytics: true,
    includeAttachments: false,
    categories: []
  })

  const exportFormats: ExportFormat[] = [
    { type: 'pdf', label: t('export.pdf'), icon: '📄' },
    { type: 'excel', label: t('export.excel'), icon: '📊' },
    { type: 'csv', label: t('export.csv'), icon: '📝' },
    { type: 'json', label: t('export.json'), icon: '🔗' }
  ]

  const updateOption = <K extends keyof ExportOptions>(
    key: K,
    value: ExportOptions[K]
  ) => {
    setOptions(prev => ({ ...prev, [key]: value }))
  }

  const toggleCategory = (categoryId: string) => {
    const current = options.categories || []
    const updated = current.includes(categoryId)
      ? current.filter(id => id !== categoryId)
      : [...current, categoryId]
    updateOption('categories', updated)
  }

  const handleExport = async () => {
    try {
      setExporting(true)

      let result
      switch (options.format) {
        case 'csv':
          result = await exportService.exportToCSV(options)
          break
        case 'json':
          result = await exportService.exportToJSON(options)
          break
        case 'pdf':
          result = await exportService.exportToPDF(options)
          break
        case 'excel':
          result = await exportService.exportToExcel(options)
          break
        default:
          throw new Error('Format not supported yet')
      }

      Alert.alert(
        t('common.success'),
        `Export completed successfully! ${result.message || ''}`,
        [{ text: 'OK', onPress: onClose }]
      )
    } catch (error: any) {
      console.error('Export error:', error)
      
      let errorMessage = 'Failed to export data. Please try again.'
      
      if (error.message?.includes('column') && error.message?.includes('does not exist')) {
        errorMessage = 'Database configuration error. Please contact support.'
      } else if (error.message?.includes('UTF8')) {
        errorMessage = 'Export service configuration error.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      Alert.alert(t('common.error'), errorMessage)
    } finally {
      setExporting(false)
    }
  }

  const renderFormattedText = (content: string, style: any = {}) => (
    <Text style={style}>{content}</Text>
  )

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('export.title')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            {renderFormattedText('✕', styles.closeButtonText)}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Format Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('export.format')}</Text>
            <View style={styles.formatGrid}>
              {exportFormats.map((format) => (
                <TouchableOpacity
                  key={format.type}
                  style={[
                    styles.formatCard,
                    options.format === format.type && styles.formatCardActive
                  ]}
                  onPress={() => updateOption('format', format.type)}
                >
                  {renderFormattedText(format.icon, styles.formatIcon)}
                  {renderFormattedText(format.label, [
                    styles.formatLabel,
                    options.format === format.type && styles.formatLabelActive
                  ])}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date Range */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('export.dateRange')}</Text>
            
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={styles.dateLabel}>Start Date:</Text>
              <Text style={styles.dateValue}>
                {options.dateRange?.start.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            {showStartPicker && (
              <DateTimePicker
                value={options.dateRange?.start || new Date()}
                mode="date"
                onChange={(event, date) => {
                  setShowStartPicker(false)
                  if (date) {
                    updateOption('dateRange', {
                      ...options.dateRange!,
                      start: date
                    })
                  }
                }}
              />
            )}

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={styles.dateLabel}>End Date:</Text>
              <Text style={styles.dateValue}>
                {options.dateRange?.end.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            {showEndPicker && (
              <DateTimePicker
                value={options.dateRange?.end || new Date()}
                mode="date"
                onChange={(event, date) => {
                  setShowEndPicker(false)
                  if (date) {
                    updateOption('dateRange', {
                      ...options.dateRange!,
                      end: date
                    })
                  }
                }}
                minimumDate={options.dateRange?.start}
              />
            )}
          </View>

          {/* Export Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('export.options')}</Text>
            
            <View style={styles.optionItem}>
              <Text style={styles.optionLabel}>{t('export.includeComments')}</Text>
              <Switch
                value={options.includeComments}
                onValueChange={(value) => updateOption('includeComments', value)}
              />
            </View>

            <View style={styles.optionItem}>
              <Text style={styles.optionLabel}>{t('export.includeAnalytics')}</Text>
              <Switch
                value={options.includeAnalytics}
                onValueChange={(value) => updateOption('includeAnalytics', value)}
              />
            </View>

            <View style={styles.optionItem}>
              <Text style={styles.optionLabel}>{t('export.includeAttachments')}</Text>
              <Switch
                value={options.includeAttachments}
                onValueChange={(value) => updateOption('includeAttachments', value)}
              />
            </View>
          </View>

          {/* Category Filter */}
          {categories.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('export.selectCategories')}</Text>
              <Text style={styles.sectionSubtitle}>
                Leave empty to export all categories
              </Text>
              
              <View style={styles.categoryList}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryItem,
                      options.categories?.includes(category.id) && styles.categoryItemActive
                    ]}
                    onPress={() => toggleCategory(category.id)}
                  >
                    {renderFormattedText(category.icon, styles.categoryIcon)}
                    {renderFormattedText(category.name, [
                      styles.categoryName,
                      options.categories?.includes(category.id) && styles.categoryNameActive
                    ])}
                    {options.categories?.includes(category.id) && (
                      <Text style={styles.categoryCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={exporting}
          >
            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.exportButton, exporting && styles.buttonDisabled]}
            onPress={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.exportButtonText}>{t('export.exportButton')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  formatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  formatCard: {
    width: '47%',
    aspectRatio: 1.5,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  formatCardActive: {
    backgroundColor: '#007AFF10',
    borderColor: '#007AFF',
  },
  formatIcon: {
    fontSize: 32,
  },
  formatLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  formatLabelActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  dateValue: {
    fontSize: 14,
    color: '#1e293b',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  categoryList: {
    gap: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  categoryItemActive: {
    backgroundColor: '#007AFF10',
    borderColor: '#007AFF',
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  categoryNameActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  categoryCheck: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  exportButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
})