// components/announcements/NotificationSettingsModal.tsx
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
  Alert
} from 'react-native'
import { useNotificationSettings } from '../../hooks/useNotificationSettings'
import { useCategories } from '../../hooks/useCategories'
import { notificationService } from '../../services/notificationService'
import { useAuth } from '../../hooks/useAuth'

interface NotificationSettingsModalProps {
  visible: boolean
  onClose: () => void
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  visible,
  onClose
}) => {
  const { user } = useAuth()
  const { settings, loading, updateSettings } = useNotificationSettings()
  const { categories } = useCategories()
  const [hasPermission, setHasPermission] = useState(false)

  useEffect(() => {
    checkPermissions()
  }, [visible])

  const checkPermissions = async () => {
    if (!user) return
    
    try {
      const token = await notificationService.registerForPushNotifications(user.id)
      setHasPermission(!!token)
    } catch (error) {
      setHasPermission(false)
    }
  }

  const handleToggle = async (field: string, value: boolean) => {
    try {
      await updateSettings({ [field]: value })
    } catch (error) {
      Alert.alert('Error', 'Failed to update settings')
    }
  }

  const handleCategoryToggle = async (categoryId: string) => {
    if (!settings) return

    const currentFilters = settings.category_filters || []
    const newFilters = currentFilters.includes(categoryId)
      ? currentFilters.filter(id => id !== categoryId)
      : [...currentFilters, categoryId]

    try {
      await updateSettings({ category_filters: newFilters })
    } catch (error) {
      Alert.alert('Error', 'Failed to update category filters')
    }
  }

  if (loading || !settings) {
    return null
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Notification Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {!hasPermission && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Notifications Disabled</Text>
                <Text style={styles.warningText}>
                  Please enable notifications in your device settings
                </Text>
              </View>
            </View>
          )}

          {/* General Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>General</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive push notifications for announcements
                </Text>
              </View>
              <Switch
                value={settings.push_enabled}
                onValueChange={(value) => handleToggle('push_enabled', value)}
                disabled={!hasPermission}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Email Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive email notifications for announcements
                </Text>
              </View>
              <Switch
                value={settings.email_enabled}
                onValueChange={(value) => handleToggle('email_enabled', value)}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>New Announcements</Text>
                <Text style={styles.settingDescription}>
                  Get notified when new announcements are posted
                </Text>
              </View>
              <Switch
                value={settings.new_announcements}
                onValueChange={(value) => handleToggle('new_announcements', value)}
                disabled={!settings.push_enabled && !settings.email_enabled}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Important Only</Text>
                <Text style={styles.settingDescription}>
                  Only notify for important announcements
                </Text>
              </View>
              <Switch
                value={settings.important_only}
                onValueChange={(value) => handleToggle('important_only', value)}
                disabled={!settings.new_announcements}
              />
            </View>
          </View>

          {/* Comment Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comments</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Comment Replies</Text>
                <Text style={styles.settingDescription}>
                  Get notified when someone replies to your comment
                </Text>
              </View>
              <Switch
                value={settings.comment_replies}
                onValueChange={(value) => handleToggle('comment_replies', value)}
                disabled={!settings.push_enabled && !settings.email_enabled}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Mentions</Text>
                <Text style={styles.settingDescription}>
                  Get notified when someone mentions you
                </Text>
              </View>
              <Switch
                value={settings.mentions}
                onValueChange={(value) => handleToggle('mentions', value)}
                disabled={!settings.push_enabled && !settings.email_enabled}
              />
            </View>
          </View>

          {/* Category Filters */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category Filters</Text>
            <Text style={styles.sectionDescription}>
              Only receive notifications for selected categories
            </Text>
            
            <View style={styles.categoryList}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryItem,
                    settings.category_filters?.includes(category.id) && styles.categoryItemActive
                  ]}
                  onPress={() => handleCategoryToggle(category.id)}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text style={[
                    styles.categoryName,
                    settings.category_filters?.includes(category.id) && styles.categoryNameActive
                  ]}>
                    {category.name}
                  </Text>
                  {settings.category_filters?.includes(category.id) && (
                    <Text style={styles.categoryCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            {settings.category_filters && settings.category_filters.length === 0 && (
              <Text style={styles.allCategoriesText}>
                All categories enabled
              </Text>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={onClose}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#991b1b',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#64748b',
  },
  categoryList: {
    gap: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  categoryItemActive: {
    backgroundColor: '#007AFF10',
    borderColor: '#007AFF',
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  categoryNameActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  categoryCheck: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  allCategoriesText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  doneButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
})