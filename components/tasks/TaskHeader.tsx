// components/tasks/TaskHeader.tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { IS_MOBILE } from '../../constants/home'
import { TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface TaskHeaderProps {
  onAddTaskPress: () => void;
}

export const TaskHeader: React.FC<TaskHeaderProps> = ({ onAddTaskPress }) => {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Tasks</Text>
      <Text style={styles.subtitle}>Manage your team's tasks</Text>
       <View style={{ position: 'absolute', right: 24, top: 60 }}>
     <TouchableOpacity 
        style={styles.addTaskButton}
        onPress={onAddTaskPress}
      >
         <Ionicons name="add-outline" size={24} color="#ffffff" />
      </TouchableOpacity>
  </View>
    </View>

  )
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: IS_MOBILE ? 24 : 24,
    fontWeight: '800',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  addTaskButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  addTaskButton: {
backgroundColor: '#333',
      width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
  },
})