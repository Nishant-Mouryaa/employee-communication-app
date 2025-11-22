// screens/AdminScreen.tsx
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { isAdmin, createChannel, getAllUsers, updateUserRole } from '../services/adminService'
import { getComplianceSettings, updateComplianceSettings, exportUserData, getAuditLogs } from '../services/complianceService'
import { upsertAccessPolicy, getAccessPolicy } from '../services/adminService'
import { UserRole, ComplianceSettings, AccessPolicy } from '../types/security'
import { Profile } from '../types/chat'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function AdminScreen() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState<'channels' | 'users' | 'policies' | 'compliance' | 'audit'>('channels')
  
  // Channel creation
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelDesc, setNewChannelDesc] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  
  // Users
  const [users, setUsers] = useState<Profile[]>([])
  
  // Compliance
  const [complianceSettings, setComplianceSettings] = useState<ComplianceSettings | null>(null)
  const [retentionDays, setRetentionDays] = useState(365)
  const [encryptionEnabled, setEncryptionEnabled] = useState(false)
  
  // Access Policy
  const [accessPolicy, setAccessPolicy] = useState<AccessPolicy | null>(null)
  const [allowCrossDept, setAllowCrossDept] = useState(false)
  
  // Audit logs
  const [auditLogs, setAuditLogs] = useState<any[]>([])

  useEffect(() => {
    if (user) {
      checkAdminAccess()
    }
  }, [user])

  const checkAdminAccess = async () => {
    if (!user) return
    
    try {
      const admin = await isAdmin(user.id)
      setIsUserAdmin(admin)
      
      if (admin) {
        await loadAdminData()
      }
    } catch (error) {
      console.error('Error checking admin access:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAdminData = async () => {
    try {
      const [usersData, settings, policy, logs] = await Promise.all([
        getAllUsers(),
        getComplianceSettings(),
        getAccessPolicy(),
        getAuditLogs(50),
      ])

       console.log('Users data:', usersData); // Add this line
    console.log('Number of users:', usersData?.length); // And this line
    
    setUsers(usersData || []); // Ensure it's always an array
      setComplianceSettings(settings)
      setAccessPolicy(policy)
      setAuditLogs(logs)
      
      if (settings) {
        setRetentionDays(settings.data_retention_days || 365)
        setEncryptionEnabled(settings.encryption_enabled || false)
      }
      
      if (policy) {
        setAllowCrossDept(policy.allow_cross_department || false)
      }
    } catch (error) {
      console.error('Error loading admin data:', error)
    }
  }

  const handleCreateChannel = async () => {
    if (!user || !newChannelName.trim()) {
      Alert.alert('Error', 'Please enter a channel name')
      return
    }

    try {
      await createChannel(
        newChannelName.trim(),
        newChannelDesc.trim(),
        user.id,
        {
          isPrivate,
        }
      )
      
      Alert.alert('Success', 'Channel created successfully')
      setNewChannelName('')
      setNewChannelDesc('')
      setIsPrivate(false)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create channel')
    }
  }

  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    if (!user) return

    Alert.alert(
      'Update Role',
      `Change user role to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              await updateUserRole(userId, newRole, user.id)
              await loadAdminData()
              Alert.alert('Success', 'User role updated')
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to update role')
            }
          },
        },
      ]
    )
  }

  const handleSaveComplianceSettings = async () => {
    if (!user) return

    try {
      await updateComplianceSettings({
        data_retention_days: retentionDays,
        encryption_enabled: encryptionEnabled,
        auto_delete_enabled: true,
        audit_logging_enabled: true,
        gdpr_compliant: true,
      })
      
      Alert.alert('Success', 'Compliance settings updated')
      await loadAdminData()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update settings')
    }
  }

  const handleSaveAccessPolicy = async () => {
    if (!user) return

    try {
      await upsertAccessPolicy(
        {
          allow_cross_department: allowCrossDept,
          allow_external: false,
        },
        user.id
      )
      
      Alert.alert('Success', 'Access policy updated')
      await loadAdminData()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update policy')
    }
  }

  const handleExportUserData = async (userId: string) => {
    try {
      const data = await exportUserData(userId)
      Alert.alert(
        'Data Export',
        `Exported ${Object.keys(data).length} data types for user`,
        [{ text: 'OK' }]
      )
      console.log('Exported data:', data)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export data')
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading admin panel...</Text>
      </View>
    )
  }

  if (!isUserAdmin) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Access Denied</Text>
        <Text style={styles.errorSubtext}>
          You must be an administrator to access this panel
        </Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <SafeAreaView style={styles.header}>
        <Text style={styles.headerTitle}>Admin Panel</Text>
      </SafeAreaView>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['channels', 'users'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Channel Management */}
      {activeTab === 'channels' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create Channel</Text>
          <TextInput
            style={styles.input}
            placeholder="Channel name"
            value={newChannelName}
            onChangeText={setNewChannelName}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description (optional)"
            value={newChannelDesc}
            onChangeText={setNewChannelDesc}
            multiline
          />
          <View style={styles.switchRow}>
            <Text>Private channel</Text>
            <Switch value={isPrivate} onValueChange={setIsPrivate} />
          </View>
          <TouchableOpacity style={styles.button} onPress={handleCreateChannel}>
            <Text style={styles.buttonText}>Create Channel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* User Management */}
      {activeTab === 'users' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Management</Text>
          {users.map(userItem => (
            <View key={userItem.id} style={styles.userCard}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{userItem.full_name || userItem.username}</Text>
                <Text style={styles.userMeta}>
                  {userItem.department} • {userItem.role || 'employee'}
                </Text>
              </View>
              <View style={styles.userActions}>
                <TouchableOpacity
                  style={styles.roleButton}
                  onPress={() => handleUpdateUserRole(userItem.id!, 'admin')}
                >
                  <Text style={styles.roleButtonText}>Admin</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.roleButton}
                  onPress={() => handleUpdateUserRole(userItem.id!, 'manager')}
                >
                  <Text style={styles.roleButtonText}>Manager</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.roleButton}
                  onPress={() => handleUpdateUserRole(userItem.id!, 'employee')}
                >
                  <Text style={styles.roleButtonText}>Employee</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.exportButton}
                  onPress={() => handleExportUserData(userItem.id!)}
                >
                  <Text style={styles.exportButtonText}>Export</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

     

 

    
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  loadingText: {
    marginTop: 16,
    color: '#64748b',
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 40,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    color: '#64748b',
  },
  tabTextActive: {
    color: '#6366F1',
    fontWeight: '600',
  },
  section: {
    padding: 20,
    backgroundColor: 'white',
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  button: {
    backgroundColor: '#6366F1',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  userCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginBottom: 12,
  },
  userInfo: {
    marginBottom: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  userMeta: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  userActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
  },
  roleButtonText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '500',
  },
  exportButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e0e7ff',
    borderRadius: 6,
  },
  exportButtonText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  numberInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 8,
    width: 80,
    textAlign: 'center',
  },
  logCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    marginBottom: 8,
  },
  logAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  logDetails: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
})

