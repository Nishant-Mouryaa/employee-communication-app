// components/tasks/TaskHeader.tsx
import React, { useState } from 'react'
import { View, Text, StyleSheet, TextInput } from 'react-native'
import { TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { TaskFilters } from './TaskFilters'
import { TaskFilter } from '../../types/tasks'

interface TaskHeaderProps {
  onAddTaskPress: () => void;
  activeFilter: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
  onSearchChange?: (text: string) => void;
}

export const TaskHeader: React.FC<TaskHeaderProps> = ({ 
  onAddTaskPress, 
  activeFilter, 
  onFilterChange,
  onSearchChange 
}) => {
  const [searchText, setSearchText] = useState('')

  const handleSearchChange = (text: string) => {
    setSearchText(text)
    onSearchChange?.(text)
  }

  return (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Tasks</Text>
        <Text style={styles.subtitle}>Manage your team's work efficiently</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks..."
          placeholderTextColor="#9CA3AF"
          value={searchText}
          onChangeText={handleSearchChange}
        />
      </View>

      <TaskFilters activeFilter={activeFilter} onFilterChange={onFilterChange} />
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 24,
    backgroundColor: '#1E293B', // Dark blue/navy color
  },
  titleContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#CBD5E1',
    fontWeight: '400',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
  },
})