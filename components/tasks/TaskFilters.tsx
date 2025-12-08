// components/tasks/TaskFilters.tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { TaskFilter } from '../../types/tasks'

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
  )
}

const styles = StyleSheet.create({
  filterContainer: {
    flexGrow: 0,
  },
  filterContent: {
    gap: 8,
    paddingVertical: 4,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'white',
    borderWidth: 0,
  },
  filterButtonActive: {
    backgroundColor: '#3B4B6B',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  filterButtonTextActive: {
    color: 'white',
  },
})