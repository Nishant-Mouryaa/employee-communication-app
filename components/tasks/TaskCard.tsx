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
  return (
    <TouchableOpacity 
      style={styles.taskCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.taskHeader}>
        <View style={styles.taskTitleContainer}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <View style={styles.badgesRow}>
            <View style={[
              styles.priorityBadge,
              { backgroundColor: PRIORITY_COLORS[task.priority] }
            ]}>
              <Text style={styles.priorityText}>
                {task.priority.toUpperCase()}
              </Text>
            </View>
            {task.labels && task.labels.length > 0 && (
              <View style={styles.labelsPreview}>
                {task.labels.slice(0, 2).map((label) => (
                  <View
                    key={label.id}
                    style={[styles.labelChip, { backgroundColor: label.color + '20', borderColor: label.color }]}
                  >
                    <Text style={[styles.labelChipText, { color: label.color }]}>
                      {label.name}
                    </Text>
                  </View>
                ))}
                {task.labels.length > 2 && (
                  <Text style={styles.moreLabelIndicator}>
                    +{task.labels.length - 2}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[task.status] }]}
          onPress={onStatusPress}
        >
          <Text style={styles.statusText}>
            {task.status.replace('-', ' ').toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      {task.description ? (
        <Text style={styles.taskDescription} numberOfLines={2}>
          {task.description}
        </Text>
      ) : null}

      <View style={styles.taskFooter}>
        <View style={styles.taskMeta}>
          <Text style={styles.assignedTo}>
            👤 {task.assigned_to_profile?.full_name || task.assigned_to_profile?.username || 'Unassigned'}
          </Text>
          <Text style={[
            styles.dueDate,
            isOverdue(task.due_date) && styles.overdueDate
          ]}>
            📅 {formatDate(task.due_date)}
            {isOverdue(task.due_date) && ' ⚠️'}
          </Text>
        </View>
        
        <View style={styles.taskIcons}>
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
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  taskCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  labelsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  labelChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  labelChipText: {
    fontSize: 9,
    fontWeight: '600',
  },
  moreLabelIndicator: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  taskDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskMeta: {
    flex: 1,
  },
  assignedTo: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  dueDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  overdueDate: {
    color: '#EF4444',
    fontWeight: '600',
  },
  taskIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  iconBadgeText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
})