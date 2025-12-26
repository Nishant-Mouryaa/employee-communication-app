// components/announcements/AnnouncementHeader.tsx
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { CompactSearch } from './CompactSearch'
import { SearchFilters, Category } from '../../types/announcement'
import { CreateAnnouncementModal } from './CreateAnnouncementModal'

interface AnnouncementHeaderProps {
  onAddAnnouncementPress: () => void;
  onFiltersChange: (filters: Partial<SearchFilters>) => void;
  categories: Category[];
  currentFilters: SearchFilters;
  showCreateButton?: boolean;
}

export const AnnouncementHeader: React.FC<AnnouncementHeaderProps> = ({ 
  onAddAnnouncementPress, 
  onFiltersChange,
  categories,
  currentFilters,
  showCreateButton = true 
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerBackground} />
      <View style={styles.headerContent}>
        <View style={styles.topRow}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>Announcements</Text>
            <Text style={styles.subtitle}>Stay updated with company news</Text>
          </View>
          
          <View style={styles.actions}>
            <CompactSearch 
              onFiltersChange={onFiltersChange}
              categories={categories}
              currentFilters={currentFilters}
            />
            
            {showCreateButton && (
              <TouchableOpacity 
                style={styles.addButton}
                onPress={onAddAnnouncementPress}
                activeOpacity={0.7}
              >
                <Ionicons name="add-outline" size={24} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    minHeight: 140,
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1E293B'
  },
  headerContent: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addButton: {
    backgroundColor: '#333',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
})