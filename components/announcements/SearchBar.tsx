// components/announcements/SearchBar.tsx
import React from 'react'
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native'

interface SearchBarProps {
  searchQuery: string
  onSearchChange: (text: string) => void
  onClear: () => void
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  searchQuery, 
  onSearchChange, 
  onClear 
}) => {
  return (
    <View style={styles.searchInputContainer}>
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search announcements..."
        value={searchQuery}
        onChangeText={onSearchChange}
        placeholderTextColor="#9ca3af"
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={onClear} style={styles.clearButton}>
          <Text style={styles.clearIcon}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 12,
    color: '#64748b',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: 'bold',
  },
})