// components/tasks/TaskList.tsx
import React from 'react'
import { FlatList, View, Text, StyleSheet } from 'react-native'
import { TaskWithLabels } from '../../types/tasks'
import { TaskCard } from './TaskCard'

interface TaskListProps {
  tasks: TaskWithLabels[]
  attachments: Record<string, any[]>
  comments: Record<string, any[]>
  loading: boolean
  filterType: string
  onTaskPress: (task: TaskWithLabels) => void
  onStatusPress: (task: TaskWithLabels) => void
  onRefresh: () => void
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  attachments,
  comments,
  loading,
  filterType,
  onTaskPress,
  onStatusPress,
  onRefresh
}) => {
  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      style={styles.taskList}
      refreshing={loading}
      onRefresh={onRefresh}
      renderItem={({ item }) => (
        <TaskCard
          task={item}
          attachmentCount={attachments[item.id]?.length || 0}
          commentCount={comments[item.id]?.length || 0}
          onPress={() => onTaskPress(item)}
          onStatusPress={() => onStatusPress(item)}
        />
      )}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No tasks found</Text>
          <Text style={styles.emptySubtext}>
            {filterType === 'all' 
              ? 'Create your first task to get started!'
              : `No ${filterType.replace('-', ' ')} tasks`
            }
          </Text>
        </View>
      }
    />
  )
}

const styles = StyleSheet.create({
  taskList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
})