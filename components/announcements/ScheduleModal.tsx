// components/announcements/ScheduleModal.tsx
import React, { useState } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'

interface ScheduleModalProps {
  visible: boolean
  onClose: () => void
  onSchedule: (scheduledAt: Date, expiresAt?: Date) => void
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  visible,
  onClose,
  onSchedule
}) => {
  const [scheduledDate, setScheduledDate] = useState(new Date())
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined)
  const [showSchedulePicker, setShowSchedulePicker] = useState(false)
  const [showExpiryPicker, setShowExpiryPicker] = useState(false)
  const [hasExpiry, setHasExpiry] = useState(false)

  const handleSchedule = () => {
    onSchedule(scheduledDate, hasExpiry ? expiryDate : undefined)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Schedule Announcement</Text>

          <View style={styles.section}>
            <Text style={styles.label}>Publish Date & Time *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowSchedulePicker(true)}
            >
              <Text style={styles.dateText}>
                📅 {scheduledDate.toLocaleString()}
              </Text>
            </TouchableOpacity>
          </View>

          {showSchedulePicker && (
            <DateTimePicker
              value={scheduledDate}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowSchedulePicker(Platform.OS === 'ios')
                if (date) setScheduledDate(date)
              }}
              minimumDate={new Date()}
            />
          )}

          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <Text style={styles.label}>Set Expiry Date</Text>
              <TouchableOpacity
                style={[styles.toggle, hasExpiry && styles.toggleActive]}
                onPress={() => setHasExpiry(!hasExpiry)}
              >
                <View style={[styles.toggleThumb, hasExpiry && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>

            {hasExpiry && (
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowExpiryPicker(true)}
              >
                <Text style={styles.dateText}>
                  ⏰ {expiryDate?.toLocaleString() || 'Select expiry date'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {showExpiryPicker && hasExpiry && (
            <DateTimePicker
              value={expiryDate || new Date()}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowExpiryPicker(Platform.OS === 'ios')
                if (date) setExpiryDate(date)
              }}
              minimumDate={scheduledDate}
            />
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.scheduleButton}
              onPress={handleSchedule}
            >
              <Text style={styles.scheduleButtonText}>Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
  },
  dateText: {
    fontSize: 16,
    color: '#1e293b',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e2e8f0',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#007AFF',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  scheduleButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  scheduleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
})