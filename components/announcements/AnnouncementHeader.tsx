// components/announcements/AnnouncementHeader.tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export const AnnouncementHeader = () => {
  return (
    <View style={styles.header}>
      <View style={styles.headerBackground} />
      <View style={styles.headerContent}>
        <Text style={styles.title}>Announcements</Text>
        <Text style={styles.subtitle}>Stay updated with company news</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#007AFF',
    minHeight: 140,
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#007AFF',
  },
  headerContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
})