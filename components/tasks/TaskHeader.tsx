// components/tasks/TaskHeader.tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export const TaskHeader: React.FC = () => {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Tasks</Text>
      <Text style={styles.subtitle}>Manage your team's tasks</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#6366F1',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
})