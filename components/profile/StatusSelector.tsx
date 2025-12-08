// components/StatusSelector.tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { STATUS_OPTIONS } from '../../constants/profile'

interface StatusSelectorProps {
  value: string
  isEditing: boolean
  onChange: (status: string) => void
}

export function StatusSelector({ value, isEditing, onChange }: StatusSelectorProps) {
  return (
    <View style={styles.statusContainer}>
      <Text style={styles.label}>Status</Text>
      <View style={styles.statusGrid}>
        {STATUS_OPTIONS.map((option) => {
          const isSelected = value === option
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.statusChip,
                isSelected && styles.statusChipSelected,
                !isEditing && styles.statusChipDisabled,
              ]}
              disabled={!isEditing}
              onPress={() => onChange(value === option ? '' : option)}
            >
              <Text
                style={[
                  styles.statusChipText,
                  isSelected && styles.statusChipTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
      {value ? (
        <TouchableOpacity
          style={styles.clearStatusButton}
          onPress={() => onChange('')}
          disabled={!isEditing}        >
          <Text style={styles.clearStatusText}>Clear status</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  statusContainer: {
    marginBottom: 20,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  statusChipSelected: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  statusChipDisabled: {
    opacity: 0.6,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  statusChipTextSelected: {
    color: 'white',
  },
  clearStatusButton: {
    marginTop: 8,
  },
  clearStatusText: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    color: '#374151',
    marginLeft: 4,
  },
})