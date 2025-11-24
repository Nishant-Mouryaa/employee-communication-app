// components/chat/MeetingInviteModal.tsx
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Message } from '../../types/chat'
import { createMeetingFromMessage, openCalendarApp, MeetingInvite } from '../../services/calendarService'
import { Profile } from '../../types/chat'

interface MeetingInviteModalProps {
  visible: boolean
  message: Message | null
  currentUserId: string
  organizationId?: string | null
  channelMembers: Map<string, Profile>
  channelId?: string
  onClose: () => void
  onSuccess?: () => void
}

export const MeetingInviteModal: React.FC<MeetingInviteModalProps> = ({
  visible,
  message,
  currentUserId,
  organizationId,
  channelMembers,
  channelId,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState(new Date())
  const [endDate, setEndDate] = useState(new Date(Date.now() + 60 * 60 * 1000)) // 1 hour later
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set([currentUserId]))
  const [showStartPicker, setShowStartPicker] = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)
  const [showAttendeePicker, setShowAttendeePicker] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (message && visible) {
      setTitle(`Meeting: ${message.content.substring(0, 50)}`)
      setDescription(message.content)
      setStartDate(new Date())
      setEndDate(new Date(Date.now() + 60 * 60 * 1000))
      setSelectedAttendees(new Set([currentUserId]))
    }
  }, [message, visible, currentUserId])

  const handleCreateMeeting = async () => {
    if (!message || !title.trim()) {
      Alert.alert('Error', 'Please provide a meeting title')
      return
    }

    if (!organizationId) {
      Alert.alert('Error', 'Organization context missing. Please try again.')
      return
    }

    if (startDate >= endDate) {
      Alert.alert('Error', 'End time must be after start time')
      return
    }

    setLoading(true)
    try {
      const inviteData: MeetingInvite = {
        title: title.trim(),
        description: description.trim() || undefined,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        location: location.trim() || undefined,
        attendees: Array.from(selectedAttendees),
        channel_id: channelId,
        message_id: message.id,
        reminder_minutes: [15, 60],
      }

      const meeting = await createMeetingFromMessage(message, currentUserId, organizationId, inviteData)

      Alert.alert(
        'Meeting Created',
        'Would you like to add this to your calendar?',
        [
          { text: 'Later', onPress: () => {
            onClose()
            if (onSuccess) onSuccess()
          }},
          {
            text: 'Add to Calendar',
            onPress: async () => {
              try {
                await openCalendarApp(inviteData)
                onClose()
                if (onSuccess) onSuccess()
              } catch (error) {
                Alert.alert('Error', 'Failed to open calendar app')
              }
            },
          },
        ]
      )
    } catch (error) {
      console.error('Error creating meeting:', error)
      Alert.alert('Error', 'Failed to create meeting. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggleAttendee = (userId: string) => {
    const newSet = new Set(selectedAttendees)
    if (newSet.has(userId)) {
      newSet.delete(userId)
    } else {
      newSet.add(userId)
    }
    setSelectedAttendees(newSet)
  }

  const membersList = Array.from(channelMembers.values())
  const selectedCount = selectedAttendees.size

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Meeting</Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.section}>
            <Text style={styles.label}>Meeting Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter meeting title"
              maxLength={200}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter meeting description"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Meeting location or video link"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Start Time *</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#64748b" />
              <Text style={styles.pickerText}>
                {startDate.toLocaleString()}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>End Time *</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#64748b" />
              <Text style={styles.pickerText}>
                {endDate.toLocaleString()}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Attendees ({selectedCount})</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowAttendeePicker(true)}
            >
              <Ionicons name="people-outline" size={20} color="#64748b" />
              <Text style={styles.pickerText}>
                {selectedCount} attendee{selectedCount !== 1 ? 's' : ''} selected
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={handleCreateMeeting}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="calendar" size={20} color="white" />
                <Text style={styles.createButtonText}>Create Meeting</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Attendee Picker Modal */}
        <Modal
          visible={showAttendeePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAttendeePicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowAttendeePicker(false)}
          >
            <View style={styles.pickerModal}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select Attendees</Text>
                <TouchableOpacity onPress={() => setShowAttendeePicker(false)}>
                  <Ionicons name="close" size={24} color="#1e293b" />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {membersList.map(member => (
                  <TouchableOpacity
                    key={member.id}
                    style={styles.pickerOption}
                    onPress={() => toggleAttendee(member.id!)}
                  >
                    <Text style={styles.pickerOptionText}>
                      {member.full_name || member.username}
                    </Text>
                    {selectedAttendees.has(member.id!) && (
                      <Ionicons name="checkmark-circle" size={20} color="#6366F1" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Date/Time Pickers */}
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowStartPicker(Platform.OS === 'ios')
              if (selectedDate) {
                setStartDate(selectedDate)
                // Auto-update end date if it's before start date
                if (selectedDate >= endDate) {
                  setEndDate(new Date(selectedDate.getTime() + 60 * 60 * 1000))
                }
              }
            }}
            minimumDate={new Date()}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowEndPicker(Platform.OS === 'ios')
              if (selectedDate) {
                setEndDate(selectedDate)
              }
            }}
            minimumDate={startDate}
          />
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8fafc',
    gap: 8,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#1e293b',
  },
})

