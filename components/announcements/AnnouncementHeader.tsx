// components/announcements/AnnouncementHeader.tsx
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface AnnouncementHeaderProps {
  onAddAnnouncementPress: () => void;
  showCreateButton?: boolean;
}

export const AnnouncementHeader: React.FC<AnnouncementHeaderProps> = ({ 
  onAddAnnouncementPress, 
  showCreateButton = true 
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerBackground} />
      <View style={styles.headerContent}>
        <Text style={styles.title}>Announcements</Text>
        <Text style={styles.subtitle}>Stay updated with company news</Text>
       <View style={{ position: 'absolute', right: 24, top: 60 }}>
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
  )
}

const styles = StyleSheet.create({
  header: {
    minHeight: 140,
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff'
  },
  headerContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  addButton: {
backgroundColor: '#333',
      width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})