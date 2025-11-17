// components/announcements/AdvancedSearchModal.tsx
import React, { useState } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { SearchFilters, Category } from '../../types/announcement'

interface AdvancedSearchModalProps {
  visible: boolean
  onClose: () => void
  onApply: (filters: Partial<SearchFilters>) => void
  categories: Category[]
  currentFilters: SearchFilters
}

export const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({
  visible,
  onClose,
  onApply,
  categories,
  currentFilters
}) => {
  const [localFilters, setLocalFilters] = useState<Partial<SearchFilters>>(currentFilters)
  const [showDateFromPicker, setShowDateFromPicker] = useState(false)
  const [showDateToPicker, setShowDateToPicker] = useState(false)

  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleApply = () => {
    onApply(localFilters)
    onClose()
  }

  const handleReset = () => {
    setLocalFilters({
      query: '',
      category: '',
      dateFrom: undefined,
      dateTo: undefined,
      author: undefined,
      hasAttachments: undefined,
      isImportant: undefined,
      status: 'all',
      sortBy: 'date'
    })
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Advanced Search</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Date Range */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date Range</Text>
            
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDateFromPicker(true)}
            >
              <Text style={styles.dateLabel}>From:</Text>
              <Text style={styles.dateText}>
                {localFilters.dateFrom?.toLocaleDateString() || 'Any date'}
              </Text>
            </TouchableOpacity>

            {showDateFromPicker && (
              <DateTimePicker
                value={localFilters.dateFrom || new Date()}
                mode="date"
                onChange={(event, date) => {
                  setShowDateFromPicker(false)
                  if (date) updateFilter('dateFrom', date)
                }}
                            />
            )}

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDateToPicker(true)}
            >
              <Text style={styles.dateLabel}>To:</Text>
              <Text style={styles.dateText}>
                {localFilters.dateTo?.toLocaleDateString() || 'Any date'}
              </Text>
            </TouchableOpacity>

            {showDateToPicker && (
              <DateTimePicker
                value={localFilters.dateTo || new Date()}
                mode="date"
                onChange={(event, date) => {
                  setShowDateToPicker(false)
                  if (date) updateFilter('dateTo', date)
                }}
                minimumDate={localFilters.dateFrom}
              />
            )}
          </View>

          {/* Status Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.chipGroup}>
              {['all', 'active', 'scheduled', 'expired'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.chip,
                    localFilters.status === status && styles.chipActive
                  ]}
                  onPress={() => updateFilter('status', status as any)}
                >
                  <Text style={[
                    styles.chipText,
                    localFilters.status === status && styles.chipTextActive
                  ]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sort By */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sort By</Text>
            <View style={styles.chipGroup}>
              {[
                { key: 'date', label: 'Date', icon: '📅' },
                { key: 'relevance', label: 'Relevance', icon: '🎯' },
                { key: 'reactions', label: 'Reactions', icon: '❤️' },
                { key: 'comments', label: 'Comments', icon: '💬' }
              ].map((sort) => (
                <TouchableOpacity
                  key={sort.key}
                  style={[
                    styles.chip,
                    localFilters.sortBy === sort.key && styles.chipActive
                  ]}
                  onPress={() => updateFilter('sortBy', sort.key as any)}
                >
                  <Text style={styles.chipIcon}>{sort.icon}</Text>
                  <Text style={[
                    styles.chipText,
                    localFilters.sortBy === sort.key && styles.chipTextActive
                  ]}>
                    {sort.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Additional Filters */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Filters</Text>
            
            <TouchableOpacity
              style={styles.toggleItem}
              onPress={() => updateFilter(
                'hasAttachments',
                localFilters.hasAttachments === true ? undefined : true
              )}
            >
              <View style={[
                styles.checkbox,
                localFilters.hasAttachments === true && styles.checkboxActive
              ]}>
                {localFilters.hasAttachments === true && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
              <Text style={styles.toggleLabel}>Has Attachments</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleItem}
              onPress={() => updateFilter(
                'isImportant',
                localFilters.isImportant === true ? undefined : true
              )}
            >
              <View style={[
                styles.checkbox,
                localFilters.isImportant === true && styles.checkboxActive
              ]}>
                {localFilters.isImportant === true && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
              <Text style={styles.toggleLabel}>Important Only</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleReset}
          >
            <Text style={styles.resetButtonText}>Reset All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={handleApply}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
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
    marginBottom: 12,
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
  dateText: {
    fontSize: 14,
    color: '#1e293b',
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  chipText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  chipTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  toggleLabel: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  resetButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  applyButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
})