// components/tasks/TaskHeader.tsx
import React, { useState } from 'react'
import { View, Text, StyleSheet, TextInput, Modal, TouchableOpacity, Keyboard } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { TaskFilters } from './TaskFilters'
import { TaskFilter } from '../../types/tasks'
import { Platform } from 'react-native'

interface TaskHeaderProps {
  onAddTaskPress: () => void;
  activeFilter: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
  onSearchChange?: (text: string) => void;
  showAddButton?: boolean;
}

export const TaskHeader: React.FC<TaskHeaderProps> = ({ 
  onAddTaskPress, 
  activeFilter, 
  onFilterChange,
  onSearchChange,
  showAddButton = true
}) => {
  const [searchText, setSearchText] = useState('')
  const [showSearchModal, setShowSearchModal] = useState(false)

  const handleSearchChange = (text: string) => {
    setSearchText(text)
    onSearchChange?.(text)
  }

  const openSearchModal = () => {
    setShowSearchModal(true)
  }

  const closeSearchModal = () => {
    setShowSearchModal(false)
    Keyboard.dismiss()
  }

  const clearSearch = () => {
    setSearchText('')
    onSearchChange?.('')
  }

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Tasks</Text>
            <Text style={styles.subtitle}>Manage your team's work efficiently</Text>
          </View>
          
          <View style={styles.headerButtons}>
            {/* Search Button */}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={openSearchModal}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="search-outline" size={24} color="#ffffff" />
            </TouchableOpacity>
            
            {/* Add Task Button (Optional) */}
            {showAddButton && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onAddTaskPress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="add-outline" size={24} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

    
      </View>

      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
      >
        <View style={styles.searchModalContainer}>
          <View style={styles.searchModalHeader}>
            <View style={styles.searchModalInputContainer}>
              <Ionicons name="search" size={20} color="#6A727C" style={styles.searchModalIcon} />
              <TextInput
                style={styles.searchModalInput}
                placeholder="Search tasks..."
                placeholderTextColor="#9CA3AF"
                value={searchText}
                onChangeText={handleSearchChange}
                autoFocus={true}
                returnKeyType="search"
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={clearSearch}>
                  <Ionicons name="close-circle" size={20} color="#6A727C" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={closeSearchModal} style={styles.searchModalCancelButton}>
              <Text style={styles.searchModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          {/* Search Help Text */}
          <View style={styles.searchHelpContainer}>
            <Text style={styles.searchHelpText}>
              Search for tasks by title, description, or assignee
            </Text>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 24,
    backgroundColor: '#1E293B',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  titleContainer: {
    flex: 1,
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 12,
  },
  iconButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  // Search Modal Styles
  searchModalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    marginTop: Platform.OS === 'ios' ? 44 : 0,
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchModalInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 12,
  },
  searchModalIcon: {
    marginRight: 8,
  },
  searchModalInput: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    fontWeight: '400',
  },
  searchModalCancelButton: {
    paddingVertical: 8,
  },
  searchModalCancelText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  searchHelpContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchHelpText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
})