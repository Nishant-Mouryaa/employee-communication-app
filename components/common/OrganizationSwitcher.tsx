import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTenant } from '../../hooks/useTenant'

interface OrganizationSwitcherProps {
  onPress?: () => void
  subtitle?: string
}

export const OrganizationSwitcher: React.FC<OrganizationSwitcherProps> = ({
  onPress,
  subtitle,
}) => {
  const { organization, loading } = useTenant()

  if (loading || !organization) {
    return null
  }

  const handlePress = () => {
    if (onPress) {
      onPress()
      return
    }

    Alert.alert(
      'Organization Switching',
      'Multi-organization switching is coming soon. Reach out to your admin to be added to additional workspaces.'
    )
  }

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.85}>
      <View style={styles.iconContainer}>
        <Ionicons name="business" size={16} color="#6366F1" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.nameText} numberOfLines={1}>
          {organization.name}
        </Text>
        <Text style={styles.subText}>
          {subtitle || organization.plan || 'Standard plan'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  subText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
})

