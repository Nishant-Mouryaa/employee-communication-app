// components/tasks/TaskCard.tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { TaskWithLabels } from '../../types/tasks'
import { STATUS_COLORS, PRIORITY_COLORS } from '../../constants/tasks'
import { formatDate, isOverdue } from '../../utils/taskHelpers'

interface TaskCardProps {
  task: TaskWithLabels
  attachmentCount: number
  commentCount: number
  onPress: () => void
  onStatusPress: () => void
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  attachmentCount,
  commentCount,
  onPress,
  onStatusPress
}) => {
  const priorityEmoji = {
    high: '🔴',
    medium: '🟡',
    low: '🟢'
  }

  return (
    <TouchableOpacity 
      style={styles.taskCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <TouchableOpacity
          style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[task.status] }]}
          onPress={onStatusPress}
        >
          <Text style={styles.statusText}>
            {task.status === 'todo' ? 'TODO' : 
             task.status === 'in-progress' ? 'IN PROGRESS' : 'DONE'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Priority:</Text>
        <Text style={styles.infoValue}>
          {priorityEmoji[task.priority]} {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Assigned:</Text>
        <Text style={styles.infoValue}>
          {task.assigned_to_profile?.full_name || task.assigned_to_profile?.username || 'Unassigned'}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.calendarIcon}>📅</Text>
        <Text style={[
          styles.dueDate,
          isOverdue(task.due_date) && styles.overdueDate
        ]}>
          {formatDate(task.due_date)}
        </Text>
        {isOverdue(task.due_date) && (
          <Text style={styles.warningIcon}>⚠️</Text>
        )}
      </View>

      {(attachmentCount > 0 || commentCount > 0) && (
        <View style={styles.taskFooter}>
          {attachmentCount > 0 && (
            <View style={styles.iconBadge}>
              <Text style={styles.iconBadgeText}>
                📎 {attachmentCount}
              </Text>
            </View>
          )}
          {commentCount > 0 && (
            <View style={styles.iconBadge}>
              <Text style={styles.iconBadgeText}>
                💬 {commentCount}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  taskCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '600',
    marginRight: 8,
  },
  infoValue: {
    fontSize: 15,
    color: '#4B5563',
  },
  calendarIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  dueDate: {
    fontSize: 15,
    color: '#4B5563',
    marginRight: 8,
  },
  overdueDate: {
    color: '#DC2626',
    fontWeight: '600',
  },
  warningIcon: {
    fontSize: 16,
  },
  taskFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  iconBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  iconBadgeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
})