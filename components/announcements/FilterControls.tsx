// components/announcements/FilterControls.tsx
import React from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'

interface FilterControlsProps {
  filterImportant: boolean
  onToggleImportant: () => void
  resultCount: number
  hasActiveFilters: boolean
  onClearFilters: () => void
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  filterImportant,
  onToggleImportant,
  resultCount,
  hasActiveFilters,
  onClearFilters
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.filterChip, filterImportant && styles.filterChipActive]}
        onPress={onToggleImportant}
      >
        <Text style={[styles.filterChipIcon, filterImportant && styles.filterChipIconActive]}>
          ⭐
        </Text>
        <Text style={[styles.filterChipText, filterImportant && styles.filterChipTextActive]}>
          Important
        </Text>
      </TouchableOpacity>

      <View style={styles.resultsInfo}>
        <Text style={styles.resultCount}>
          {resultCount} {resultCount === 1 ? 'announcement' : 'announcements'}
        </Text>
        {hasActiveFilters && (
          <TouchableOpacity style={styles.clearButton} onPress={onClearFilters}>
            <Text style={styles.clearText}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  filterChipIconActive: {
    color: 'white',
  },
  filterChipText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: 'white',
  },
  resultsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultCount: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
})