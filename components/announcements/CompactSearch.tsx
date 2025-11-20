// components/announcements/CompactSearch.tsx
import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SearchFilters, Category } from '../../types/announcement'

interface CompactSearchProps {
  onFiltersChange: (filters: Partial<SearchFilters>) => void
  categories: Category[]
  currentFilters: SearchFilters
}

export const CompactSearch: React.FC<CompactSearchProps> = ({
  onFiltersChange,
  categories,
  currentFilters
}) => {
  const [showModal, setShowModal] = useState(false)
  const [localFilters, setLocalFilters] = useState<Partial<SearchFilters>>(currentFilters)

  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleReset = () => {
    const resetFilters = {
      query: '',
      category: '',
      dateFrom: undefined,
      dateTo: undefined,
      author: undefined,
      hasAttachments: undefined,
      isImportant: undefined,
      status: 'all',
      sortBy: 'date'
    }
    setLocalFilters(resetFilters)
    onFiltersChange(resetFilters)
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (localFilters.query) count++
    if (localFilters.category) count++
    if (localFilters.dateFrom) count++
    if (localFilters.dateTo) count++
    if (localFilters.hasAttachments) count++
    if (localFilters.isImportant) count++
    if (localFilters.status !== 'all') count++
    if (localFilters.sortBy !== 'date') count++
    return count
  }

  const activeFilterCount = getActiveFilterCount()

  return (
    <>
      {/* Compact Search Button */}
      <TouchableOpacity
        style={styles.searchButton}
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="options-outline" size={20} color="#64748b" />
        {activeFilterCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeFilterCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Full Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Search Filters</Text>
            <View style={styles.headerActions}>
              {activeFilterCount > 0 && (
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={handleReset}
                >
                  <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.modalContent}>
            {/* Status Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Status</Text>
              <View style={styles.chipRow}>
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
              <View style={styles.chipRow}>
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

            {/* Quick Filters */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Filters</Text>
              <View style={styles.quickFilters}>
                <TouchableOpacity
                  style={[
                    styles.quickFilter,
                    localFilters.isImportant && styles.quickFilterActive
                  ]}
                  onPress={() => updateFilter(
                    'isImportant',
                    localFilters.isImportant ? undefined : true
                  )}
                >
                  <Ionicons 
                    name={localFilters.isImportant ? "star" : "star-outline"} 
                    size={16} 
                    color={localFilters.isImportant ? "#ffffff" : "#64748b"} 
                  />
                  <Text style={[
                    styles.quickFilterText,
                    localFilters.isImportant && styles.quickFilterTextActive
                  ]}>
                    Important
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.quickFilter,
                    localFilters.hasAttachments && styles.quickFilterActive
                  ]}
                  onPress={() => updateFilter(
                    'hasAttachments',
                    localFilters.hasAttachments ? undefined : true
                  )}
                >
                  <Ionicons 
                    name={localFilters.hasAttachments ? "attach" : "attach-outline"} 
                    size={16} 
                    color={localFilters.hasAttachments ? "#ffffff" : "#64748b"} 
                  />
                  <Text style={[
                    styles.quickFilterText,
                    localFilters.hasAttachments && styles.quickFilterTextActive
                  ]}>
                    Attachments
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#007AFF',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  resetButtonText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  chipText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  chipTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  quickFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  quickFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  quickFilterActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  quickFilterText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  quickFilterTextActive: {
    color: 'white',
    fontWeight: '600',
  },
})