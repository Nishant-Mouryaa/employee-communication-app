// components/home/StatCard.tsx
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'

interface StatCardProps {
  icon: string
  iconBgColor: string
  borderColor: string
  count: number
  label: string
  actionText: string
  onPress: () => void
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  iconBgColor,
  borderColor,
  count,
  label,
  actionText,
  onPress
}) => {
  return (
    <TouchableOpacity 
      style={[styles.statCard, { borderTopColor: borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.statHeader}>
        <View style={[styles.statIconContainer, { backgroundColor: iconBgColor }]}>
          <Text style={styles.statIcon}>{icon}</Text>
        </View>
        {count > 0 && (
          <View style={styles.statBadge}>
            <Text style={styles.statBadgeText}>
              {count > 99 ? '99+' : count}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.statNumber}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statAction}>{actionText}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: {
    fontSize: 24,
  },
  statBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  statAction: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '600',
  },
})