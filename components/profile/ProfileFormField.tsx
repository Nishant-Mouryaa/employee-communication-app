// components/ProfileFormField.tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Input } from 'react-native-elements'

interface ProfileFormFieldProps {
  label: string
  value: string
  placeholder: string
  disabled: boolean
  onChangeText: (text: string) => void
  icon?: string
  iconType?: string
  keyboardType?: 'default' | 'phone-pad' | 'email-address'
  multiline?: boolean
  numberOfLines?: number
  fullWidth?: boolean
}

export function ProfileFormField({
  label,
  value,
  placeholder,
  disabled,
  onChangeText,
  icon = 'user',
  iconType = 'feather',
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  fullWidth = false,
}: ProfileFormFieldProps) {
  return (
    <View style={[styles.fieldGroup, fullWidth && styles.fullWidth]}>
      <Text style={styles.label}>{label}</Text>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        disabled={disabled}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
        inputContainerStyle={[
          styles.inputContainer,
          multiline && styles.textAreaContainer,
          disabled && styles.inputContainerDisabled,
        ]}
        inputStyle={multiline ? styles.textArea : styles.input}
        placeholderTextColor="#9ca3af"
        leftIcon={{ type: iconType, name: icon, color: '#6366F1', size: 18 }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  fieldGroup: {
    width: '50%',
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  fullWidth: {
    width: '100%',
    paddingHorizontal: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    color: '#374151',
    marginLeft: 4,
  },
  inputContainer: {
    borderBottomWidth: 0,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  inputContainerDisabled: {
    backgroundColor: '#f8f9fa',
    opacity: 0.7,
  },
  input: {
    fontSize: 14,
    color: '#111827',
    paddingVertical: 8,
  },
  textAreaContainer: {
    minHeight: 90,
    alignItems: 'flex-start',
  },
  textArea: {
    textAlignVertical: 'top',
    paddingTop: 12,
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
})