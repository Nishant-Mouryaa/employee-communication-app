// components/tasks/TaskFilters.tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { TaskFilter } from '../../types/tasks'
import { Platform } from 'react-native'

interface TaskFiltersProps {
  activeFilter: TaskFilter
  onFilterChange: (filter: TaskFilter) => void
  taskCounts?: {
    all: number
    todo: number
    'in-progress': number
    done: number
  }
}

const FILTERS: { value: TaskFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

export const TaskFilters: React.FC<TaskFiltersProps> = ({ 
  activeFilter, 
  onFilterChange,
  taskCounts 
}) => {
  const getCount = (filter: TaskFilter) => {
    if (!taskCounts) return ''
    const count = taskCounts[filter]
    return count ? ` (${count})` : ' (0)'
  }

  return (
    <View style={styles.filterWrapper}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map(filter => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterButton,
              activeFilter === filter.value && styles.filterButtonActive
            ]}
            onPress={() => onFilterChange(filter.value)}
          >
            <Text style={[
              styles.filterButtonText,
              activeFilter === filter.value && styles.filterButtonTextActive
            ]}>
              {filter.label}{getCount(filter.value)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  filterWrapper: {
    minHeight: 56, // Fixed minimum height for the filter container
  },
  filterContainer: {
    flexGrow: 0, // Prevent container from expanding
    flexShrink: 1,
       backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E6EC',
  },
  filterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56, // Fixed height for content container
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F7F8FA',
    marginRight: 8,
    height: 40, // Fixed height for buttons
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100, // Minimum width for better touch targets
  },
  filterButtonActive: {
    backgroundColor: '#1C2A4A',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A727C',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Inter',
    textAlign: 'center',
    includeFontPadding: false, // Remove extra font padding
    lineHeight: 16, // Explicit line height for consistent text rendering
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
})